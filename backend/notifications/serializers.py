from rest_framework import serializers

from .models import NotificationSettings


class NotificationSettingsSerializer(serializers.ModelSerializer):
    # Write-only so the password is never returned in GET responses
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = NotificationSettings
        fields = (
            'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password',
            'from_email', 'slack_webhook_url', 'teams_webhook_url', 'updated_at',
        )
        read_only_fields = ('updated_at',)
