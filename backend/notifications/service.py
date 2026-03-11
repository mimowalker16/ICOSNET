import logging

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationService:
    EVENT_NEW_CRITICAL = 'NEW_CRITICAL'
    EVENT_SLA_BREACH = 'SLA_BREACH'
    EVENT_RECOVERY = 'RECOVERY'

    @classmethod
    def dispatch(cls, incident, event_type):
        subject, body = cls._build_message(incident, event_type)
        admin_emails = list(
            User.objects.filter(role='ADMIN', is_active=True).values_list('email', flat=True)
        )
        cls._send_email(incident, subject, body, admin_emails)

        if settings.SLACK_WEBHOOK_URL:
            cls._send_webhook(incident, settings.SLACK_WEBHOOK_URL, subject, body, 'SLACK')

        if settings.TEAMS_WEBHOOK_URL:
            cls._send_webhook(incident, settings.TEAMS_WEBHOOK_URL, subject, body, 'TEAMS')

    @classmethod
    def _build_message(cls, incident, event_type):
        if event_type == cls.EVENT_NEW_CRITICAL:
            subject = f"[CRITICAL] New Incident: {incident.title}"
            body = (
                f"A critical incident was automatically detected.\n\n"
                f"Title   : {incident.title}\n"
                f"Asset   : {incident.asset}\n"
                f"Deadline: {incident.sla_deadline}\n"
            )
        elif event_type == cls.EVENT_SLA_BREACH:
            subject = f"[SLA BREACH] Incident #{incident.id}: {incident.title}"
            body = (
                f"Incident #{incident.id} has exceeded its SLA deadline.\n\n"
                f"Title   : {incident.title}\n"
                f"Severity: {incident.severity}\n"
                f"Status  : {incident.status}\n"
                f"Deadline: {incident.sla_deadline}\n"
            )
        else:  # RECOVERY
            subject = f"[RECOVERY] Incident #{incident.id} auto-resolved: {incident.title}"
            body = (
                f"The asset is back online — incident auto-resolved.\n\n"
                f"Title      : {incident.title}\n"
                f"Asset      : {incident.asset}\n"
                f"Resolved at: {incident.resolved_at}\n"
            )
        return subject, body

    @classmethod
    def _send_email(cls, incident, subject, body, recipients):
        from .models import NotificationLog
        if not recipients:
            return
        try:
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
            for r in recipients:
                NotificationLog.objects.create(
                    incident=incident,
                    channel=NotificationLog.Channel.EMAIL,
                    recipient_or_target=r,
                    success=True,
                )
        except Exception as exc:
            logger.error("Email notification failed: %s", exc)
            for r in recipients:
                NotificationLog.objects.create(
                    incident=incident,
                    channel=NotificationLog.Channel.EMAIL,
                    recipient_or_target=r,
                    success=False,
                    error_message=str(exc),
                )

    @classmethod
    def _send_webhook(cls, incident, webhook_url, subject, body, channel):
        from .models import NotificationLog
        try:
            payload = {"text": f"*{subject}*\n{body}"}
            response = requests.post(webhook_url, json=payload, timeout=5)
            response.raise_for_status()
            NotificationLog.objects.create(
                incident=incident,
                channel=channel,
                recipient_or_target=webhook_url[:100],
                success=True,
            )
        except Exception as exc:
            logger.error("Webhook (%s) notification failed: %s", channel, exc)
            NotificationLog.objects.create(
                incident=incident,
                channel=channel,
                recipient_or_target=webhook_url[:100],
                success=False,
                error_message=str(exc),
            )
