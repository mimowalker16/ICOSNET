from django.conf import settings
from django.db import models


class Asset(models.Model):
    class AssetType(models.TextChoices):
        SERVER = 'SERVER', 'Server'
        ROUTER = 'ROUTER', 'Router'
        API = 'API', 'API'

    class CheckType(models.TextChoices):
        PING = 'PING', 'Ping (ICMP)'
        TCP = 'TCP', 'TCP Port'
        HTTP_GET = 'HTTP_GET', 'HTTP GET'

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    ip_address_or_url = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=20, choices=AssetType.choices)
    check_type = models.CharField(max_length=20, choices=CheckType.choices)
    check_port = models.PositiveIntegerField(null=True, blank=True)
    check_interval_minutes = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assets'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.ip_address_or_url})"


class AssetStatusLog(models.Model):
    class Status(models.TextChoices):
        UP = 'UP', 'Up'
        DOWN = 'DOWN', 'Down'
        DEGRADED = 'DEGRADED', 'Degraded'

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='status_logs')
    status = models.CharField(max_length=10, choices=Status.choices)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'asset_status_logs'
        ordering = ['-checked_at']

    def __str__(self):
        return f"{self.asset.name} — {self.status} at {self.checked_at}"
