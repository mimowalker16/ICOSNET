from django.db import models


class NotificationSettings(models.Model):
    """Singleton table — always pk=1."""

    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True)
    # Password stored as plain text here; rotate via env var in production
    smtp_password = models.CharField(max_length=255, blank=True)
    from_email = models.EmailField(blank=True)
    slack_webhook_url = models.URLField(blank=True)
    teams_webhook_url = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_settings'
        verbose_name = 'Notification Settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class NotificationLog(models.Model):
    class Channel(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        SLACK = 'SLACK', 'Slack'
        TEAMS = 'TEAMS', 'Teams'

    incident = models.ForeignKey(
        'incidents.Incident',
        on_delete=models.CASCADE,
        related_name='notification_logs',
    )
    channel = models.CharField(max_length=10, choices=Channel.choices)
    recipient_or_target = models.CharField(max_length=255, blank=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification_logs'
        ordering = ['-sent_at']

    def __str__(self):
        status = 'OK' if self.success else 'FAIL'
        return f"[{self.channel}] Incident #{self.incident_id} — {status}"
