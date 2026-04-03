from django.utils import timezone
from rest_framework import serializers

from .models import Incident, IncidentLog


class IncidentLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True, allow_null=True)

    class Meta:
        model = IncidentLog
        fields = ('id', 'actor', 'actor_username', 'action_type', 'old_value', 'new_value', 'comment', 'created_at')
        read_only_fields = ('id', 'actor', 'actor_username', 'action_type', 'old_value', 'new_value', 'created_at')


class IncidentListSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True, allow_null=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    is_sla_breached = serializers.BooleanField(read_only=True)

    class Meta:
        model = Incident
        fields = (
            'id', 'title', 'severity', 'status', 'source',
            'asset', 'asset_name',
            'assigned_to', 'assigned_to_username',
            'created_by', 'created_by_username',
            'sla_deadline', 'is_sla_breached',
            'created_at', 'updated_at', 'resolved_at',
        )


class IncidentDetailSerializer(IncidentListSerializer):
    logs = IncidentLogSerializer(many=True, read_only=True)

    class Meta(IncidentListSerializer.Meta):
        fields = IncidentListSerializer.Meta.fields + ('description', 'closed_at', 'logs')


class IncidentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ('title', 'description', 'asset', 'severity', 'source')

    def create(self, validated_data):
        user = self.context['request'].user
        source = validated_data.get('source', Incident.Source.MANUAL)
        assigned_to = user if source == Incident.Source.MANUAL else None
        incident = Incident.objects.create(
            created_by=user,
            assigned_to=assigned_to,
            **validated_data,
        )
        incident.compute_and_save_sla_deadline()
        IncidentLog.objects.create(
            incident=incident,
            actor=user,
            action_type=IncidentLog.ActionType.STATUS_CHANGE,
            old_value='',
            new_value=incident.status,
            comment='Incident created.',
        )
        return incident


class IncidentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ('title', 'description', 'severity', 'assigned_to')

    def update(self, instance, validated_data):
        old_assignee = instance.assigned_to
        instance = super().update(instance, validated_data)
        new_assignee = instance.assigned_to
        if old_assignee != new_assignee:
            IncidentLog.objects.create(
                incident=instance,
                actor=self.context['request'].user,
                action_type=IncidentLog.ActionType.ASSIGNMENT,
                old_value=old_assignee.username if old_assignee else '',
                new_value=new_assignee.username if new_assignee else '',
            )
        return instance


class TransitionSerializer(serializers.Serializer):
    new_status = serializers.ChoiceField(choices=Incident.Status.choices)
    comment = serializers.CharField(required=False, allow_blank=True, default='')
    assigned_to = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        new_status = attrs.get('new_status')
        assigned_to = attrs.get('assigned_to')
        if new_status in (Incident.Status.ASSIGNED, Incident.Status.IN_PROGRESS) and not assigned_to:
            raise serializers.ValidationError(
                {'assigned_to': 'This field is required when transitioning to ASSIGNED or IN_PROGRESS.'}
            )
        return attrs


class CommentSerializer(serializers.Serializer):
    comment = serializers.CharField()



