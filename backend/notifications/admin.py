from django.contrib import admin

from .models import NotificationLog, NotificationSettings


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ('smtp_host', 'smtp_port', 'from_email', 'updated_at')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('incident', 'channel', 'recipient_or_target', 'success', 'sent_at')
    list_filter = ('channel', 'success')
    readonly_fields = ('sent_at',)
