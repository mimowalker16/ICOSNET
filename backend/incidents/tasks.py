import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='incidents.tasks.check_sla_breaches')
def check_sla_breaches():
    """
    Run every 15 minutes (configured in settings.CELERY_BEAT_SCHEDULE).
    Finds all open incidents whose SLA deadline has passed and fires a
    breach notification for each one.
    """
    from incidents.models import Incident
    from notifications.service import NotificationService

    breached = Incident.objects.filter(
        status__in=[
            Incident.Status.NEW,
            Incident.Status.ASSIGNED,
            Incident.Status.IN_PROGRESS,
        ],
        sla_deadline__lt=timezone.now(),
    )

    count = 0
    for incident in breached:
        NotificationService.dispatch(incident, NotificationService.EVENT_SLA_BREACH)
        logger.warning(
            "SLA breach: Incident #%s '%s' (deadline: %s)",
            incident.pk,
            incident.title,
            incident.sla_deadline,
        )
        count += 1

    logger.info("check_sla_breaches: %d breach(es) notified", count)
    return count
