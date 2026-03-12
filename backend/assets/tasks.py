import logging

from celery import shared_task
from django.utils import timezone

from .models import Asset, AssetStatusLog
from .probes import ProbeResult, run_probe

logger = logging.getLogger(__name__)


def handle_probe_result(asset, result: ProbeResult):
    """
    Core supervision logic (used by both the Celery task and the simulation
    command so behaviour is identical in both modes).

    Rules:
    - Any result  → write an AssetStatusLog row.
    - DOWN        → create a CRITICAL SYSTEM incident if none is open.
    - UP/DEGRADED → if an open SYSTEM incident exists, auto-resolve it.
    """
    from incidents.models import Incident, IncidentLog
    from notifications.service import NotificationService

    # 1. Persist the probe result
    AssetStatusLog.objects.create(
        asset=asset,
        status=result.status,
        response_time_ms=result.response_time_ms,
        error_message=result.error_message or '',
    )

    # 2. Find any currently open SYSTEM-generated incident for this asset
    open_incident = Incident.objects.filter(
        asset=asset,
        source=Incident.Source.SYSTEM,
        status__in=[
            Incident.Status.NEW,
            Incident.Status.ASSIGNED,
            Incident.Status.IN_PROGRESS,
        ],
    ).first()

    if result.status == AssetStatusLog.Status.DOWN:
        if not open_incident:
            incident = Incident.objects.create(
                title=f"{asset.name} is DOWN",
                description=(
                    f"Automated probe detected {asset.name} "
                    f"({asset.ip_address_or_url}) is unreachable.\n"
                    f"Error: {result.error_message or 'No response'}"
                ),
                asset=asset,
                severity=Incident.Severity.CRITICAL,
                source=Incident.Source.SYSTEM,
            )
            incident.compute_and_save_sla_deadline()
            IncidentLog.objects.create(
                incident=incident,
                action_type=IncidentLog.ActionType.SYSTEM_NOTE,
                new_value='Incident auto-created by supervision probe',
            )
            NotificationService.dispatch(incident, NotificationService.EVENT_NEW_CRITICAL)
            logger.info("Incident #%s created for asset '%s'", incident.pk, asset.name)
            return incident

    elif result.status in (AssetStatusLog.Status.UP, AssetStatusLog.Status.DEGRADED):
        if open_incident:
            # Walk through any intermediate ITIL states so we always land on RESOLVED
            path_to_resolved = {
                Incident.Status.NEW: [Incident.Status.ASSIGNED, Incident.Status.IN_PROGRESS],
                Incident.Status.ASSIGNED: [Incident.Status.IN_PROGRESS],
                Incident.Status.IN_PROGRESS: [],
            }
            for intermediate in path_to_resolved.get(open_incident.status, []):
                open_incident.transition_to(
                    intermediate,
                    comment='Auto-progressed by supervision probe (recovery fast-track)',
                )
            open_incident.transition_to(
                Incident.Status.RESOLVED,
                comment='Auto-resolved: asset is back online',
            )
            NotificationService.dispatch(open_incident, NotificationService.EVENT_RECOVERY)
            logger.info("Incident #%s auto-resolved for asset '%s'", open_incident.pk, asset.name)
            return open_incident

    return None


@shared_task(bind=True, name='assets.tasks.probe_asset')
def probe_asset(self, asset_id, forced_result=None):
    """
    Probe a single asset.

    forced_result (dict, optional): skip real network probe and inject a
    synthetic result. Used by simulate_scenario.
      e.g. {'status': 'DOWN', 'response_time_ms': None, 'error_message': 'Simulated failure'}
    """
    try:
        asset = Asset.objects.get(pk=asset_id, is_active=True)
    except Asset.DoesNotExist:
        logger.warning("probe_asset: asset %s not found or inactive", asset_id)
        return

    if forced_result:
        result = ProbeResult(**forced_result)
    else:
        result = run_probe(asset)

    handle_probe_result(asset, result)


@shared_task(name='assets.tasks.run_all_probes')
def run_all_probes():
    """Dispatch a probe_asset task for every active asset."""
    ids = list(Asset.objects.filter(is_active=True).values_list('id', flat=True))
    for asset_id in ids:
        probe_asset.delay(asset_id)
    logger.info("run_all_probes: dispatched %d probe tasks", len(ids))
