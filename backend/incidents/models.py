from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class SLAPolicy(models.Model):
    class Severity(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Critical'
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'

    severity = models.CharField(max_length=10, choices=Severity.choices, unique=True)
    resolution_hours = models.PositiveIntegerField()

    class Meta:
        db_table = 'sla_policies'

    def __str__(self):
        return f"{self.severity}: {self.resolution_hours}h"


class Incident(models.Model):
    class Severity(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Critical'
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'

    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    class Source(models.TextChoices):
        SYSTEM = 'SYSTEM', 'System'
        MANUAL = 'MANUAL', 'Manual'

    # Allowed status transitions (ITIL lifecycle)
    VALID_TRANSITIONS = {
        Status.NEW: [Status.ASSIGNED],
        Status.ASSIGNED: [Status.IN_PROGRESS, Status.NEW],
        Status.IN_PROGRESS: [Status.RESOLVED, Status.ASSIGNED],
        Status.RESOLVED: [Status.CLOSED, Status.IN_PROGRESS],
        Status.CLOSED: [],
    }

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    asset = models.ForeignKey(
        'assets.Asset',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents',
    )
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.NEW)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents_created',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents_assigned',
    )
    sla_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'incidents'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title} ({self.status})"

    def compute_and_save_sla_deadline(self):
        """Calculate sla_deadline from SLAPolicy and persist it."""
        try:
            policy = SLAPolicy.objects.get(severity=self.severity)
            self.sla_deadline = self.created_at + timedelta(hours=policy.resolution_hours)
            self.save(update_fields=['sla_deadline'])
        except SLAPolicy.DoesNotExist:
            pass

    def transition_to(self, new_status, actor=None, comment=''):
        """Perform an ITIL lifecycle transition, logging the change."""
        allowed = self.VALID_TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from '{self.status}' to '{new_status}'. "
                f"Allowed transitions: {allowed}"
            )
        old_status = self.status
        self.status = new_status

        if new_status == self.Status.RESOLVED:
            self.resolved_at = timezone.now()
        if new_status == self.Status.CLOSED:
            self.closed_at = timezone.now()
        # Un-assign when bouncing back to NEW
        if new_status == self.Status.NEW:
            self.assigned_to = None

        self.save()

        IncidentLog.objects.create(
            incident=self,
            actor=actor,
            action_type=IncidentLog.ActionType.STATUS_CHANGE,
            old_value=old_status,
            new_value=new_status,
            comment=comment,
        )
        return self

    @property
    def is_sla_breached(self):
        if self.sla_deadline and self.status not in (self.Status.RESOLVED, self.Status.CLOSED):
            return timezone.now() > self.sla_deadline
        return False


class IncidentLog(models.Model):
    class ActionType(models.TextChoices):
        STATUS_CHANGE = 'STATUS_CHANGE', 'Status Change'
        COMMENT = 'COMMENT', 'Comment'
        ASSIGNMENT = 'ASSIGNMENT', 'Assignment'
        SYSTEM_NOTE = 'SYSTEM_NOTE', 'System Note'

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='logs')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    old_value = models.CharField(max_length=50, blank=True)
    new_value = models.CharField(max_length=50, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'incident_logs'
        ordering = ['created_at']

    def __str__(self):
        return f"Incident #{self.incident_id} — {self.action_type} at {self.created_at}"


class StatusRoleMapping(models.Model):
    status = models.CharField(max_length=15, choices=Incident.Status.choices, unique=True)
    role = models.ForeignKey('users.Role', on_delete=models.CASCADE, related_name='status_mappings')

    class Meta:
        db_table = 'status_role_mappings'
        ordering = ['status']

    def __str__(self):
        return f"{self.status} → {self.role.name}"
