"""
Simulate a real-world supervision scenario end-to-end without requiring
actual network connectivity.

The command injects synthetic probe results directly into handle_probe_result()
— the same function the Celery task uses — so every side-effect is real:
  • AssetStatusLog rows are written
  • Incidents are auto-created / resolved
  • Notifications are dispatched (email goes to console or SMTP per .env)
  • SLA breach alerts are triggered

Usage:
    python manage.py simulate_scenario
    python manage.py simulate_scenario --step outage
    python manage.py simulate_scenario --step recovery
    python manage.py simulate_scenario --step sla_breach
    python manage.py simulate_scenario --step full   (default, all steps)
"""
import time

from django.core.management.base import BaseCommand
from django.utils import timezone

SEP = '=' * 60


class Command(BaseCommand):
    help = 'Simulate a supervision scenario (outage → recovery → SLA breach)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--step',
            choices=['outage', 'recovery', 'sla_breach', 'full'],
            default='full',
            help='Which part of the scenario to run (default: full)',
        )
        parser.add_argument(
            '--pause',
            type=float,
            default=1.0,
            help='Seconds to pause between steps for readability (default: 1)',
        )

    def handle(self, *args, **options):
        from assets.models import Asset
        from assets.tasks import handle_probe_result
        from assets.probes import ProbeResult
        from incidents.models import Incident, IncidentLog
        from incidents.tasks import check_sla_breaches
        from notifications.service import NotificationService

        step = options['step']
        pause = options['pause']

        self.stdout.write(SEP)
        self.stdout.write(' ICOSNET Supervision Platform — Scenario Simulation')
        self.stdout.write(SEP)

        # ── Resolve target assets ────────────────────────────────────────────
        def get(name):
            try:
                return Asset.objects.get(name=name)
            except Asset.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"Asset '{name}' not found. Run: python manage.py seed_assets"
                    )
                )
                return None

        assets_down = [
            ('RTR-CORE-01',  ProbeResult('DOWN', None, 'ICMP timeout — no route to host')),
            ('SRV-MAIL-01',  ProbeResult('DOWN', None, 'TCP connect refused on port 25')),
            ('API-BILLING',  ProbeResult('DOWN', None, 'HTTP 503 Service Unavailable')),
        ]
        assets_recover = ['RTR-CORE-01', 'SRV-MAIL-01', 'API-BILLING']

        # ── STEP 1 — Outage ──────────────────────────────────────────────────
        if step in ('outage', 'full'):
            self.stdout.write(f'\n[STEP 1] Injecting outage — {len(assets_down)} assets going DOWN')
            for asset_name, result in assets_down:
                asset = get(asset_name)
                if not asset:
                    continue
                incident = handle_probe_result(asset, result)
                if incident:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  ✗ {asset_name} — {result.error_message}'
                        )
                    )
                    self.stdout.write(
                        f'    → Incident #{incident.pk} created: "{incident.title}"'
                    )
                    self.stdout.write(f'    → SLA deadline : {incident.sla_deadline}')
                    self.stdout.write( '    → Notifications: EMAIL dispatched')
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ~ {asset_name} already has an open incident — skipped'
                        )
                    )
            time.sleep(pause)

        # ── STEP 2 — Partial recovery ────────────────────────────────────────
        if step in ('recovery', 'full'):
            self.stdout.write(
                f'\n[STEP 2] RTR-CORE-01 comes back online → auto-resolution'
            )
            asset = get('RTR-CORE-01')
            if asset:
                result = ProbeResult('UP', 12, '')
                incident = handle_probe_result(asset, result)
                if incident:
                    self.stdout.write(self.style.SUCCESS(f'  ✓ RTR-CORE-01 — UP (12 ms)'))
                    self.stdout.write(f'    → Incident #{incident.pk} auto-resolved')
                    self.stdout.write( '    → RECOVERY notification dispatched')
                else:
                    self.stdout.write(self.style.WARNING('  ~ RTR-CORE-01: no open incident to resolve'))
            time.sleep(pause)

        # ── STEP 3 — SLA breach ──────────────────────────────────────────────
        if step in ('sla_breach', 'full'):
            self.stdout.write('\n[STEP 3] Simulating SLA breach on SRV-MAIL-01')
            asset = get('SRV-MAIL-01')
            if asset:
                open_incident = Incident.objects.filter(
                    asset=asset,
                    source=Incident.Source.SYSTEM,
                    status__in=[
                        Incident.Status.NEW,
                        Incident.Status.ASSIGNED,
                        Incident.Status.IN_PROGRESS,
                    ],
                ).first()
                if open_incident:
                    # Backdate the SLA deadline so the checker sees it as breached
                    open_incident.sla_deadline = timezone.now() - timezone.timedelta(minutes=30)
                    open_incident.save(update_fields=['sla_deadline'])
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ⚠ Backdated Incident #{open_incident.pk} deadline by 30 min'
                        )
                    )
                    breached_count = check_sla_breaches()
                    self.stdout.write(
                        f'  → SLA breach check ran — {breached_count} breach(es) notified'
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('  ~ No open SYSTEM incident for SRV-MAIL-01 to breach')
                    )
            time.sleep(pause)

        # ── STEP 4 — Full recovery ───────────────────────────────────────────
        if step == 'full':
            self.stdout.write('\n[STEP 4] Full recovery — remaining assets restored')
            for asset_name in ('SRV-MAIL-01', 'API-BILLING'):
                asset = get(asset_name)
                if not asset:
                    continue
                result = ProbeResult('UP', 45, '')
                incident = handle_probe_result(asset, result)
                if incident:
                    self.stdout.write(self.style.SUCCESS(f'  ✓ {asset_name} — UP'))
                    self.stdout.write(f'    → Incident #{incident.pk} auto-resolved')
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  ~ {asset_name}: no open incident to resolve')
                    )

        # ── Summary ──────────────────────────────────────────────────────────
        self.stdout.write(f'\n{SEP}')
        total_incidents = Incident.objects.filter(source=Incident.Source.SYSTEM).count()
        open_incidents = Incident.objects.filter(
            source=Incident.Source.SYSTEM,
            status__in=[Incident.Status.NEW, Incident.Status.ASSIGNED, Incident.Status.IN_PROGRESS],
        ).count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Simulation complete — '
                f'{total_incidents} total system incident(s), '
                f'{open_incidents} still open.'
            )
        )
        self.stdout.write(
            '  → Check Django Admin or GET /api/incidents/ to inspect results.'
        )
        self.stdout.write(SEP)
