from django.contrib import admin

from .models import Incident, IncidentLog, SLAPolicy


@admin.register(SLAPolicy)
class SLAPolicyAdmin(admin.ModelAdmin):
    list_display = ('severity', 'resolution_hours')


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'severity', 'status', 'source', 'assigned_to', 'sla_deadline', 'created_at')
    list_filter = ('severity', 'status', 'source')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at', 'resolved_at', 'closed_at')


@admin.register(IncidentLog)
class IncidentLogAdmin(admin.ModelAdmin):
    list_display = ('incident', 'actor', 'action_type', 'old_value', 'new_value', 'created_at')
    list_filter = ('action_type',)
    readonly_fields = ('created_at',)
