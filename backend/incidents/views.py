from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import require_perm

from .models import Incident, IncidentLog, StatusRoleMapping
from .serializers import (
    CommentSerializer,
    IncidentCreateSerializer,
    IncidentDetailSerializer,
    IncidentListSerializer,
    IncidentLogSerializer,
    IncidentUpdateSerializer,
    StatusRoleMappingSerializer,
    StatusRoleMappingWriteSerializer,
    TransitionSerializer,
)

User = get_user_model()


class IncidentListCreateView(generics.ListCreateAPIView):
    filterset_fields = ['status', 'severity', 'assigned_to', 'asset', 'source']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'severity', 'sla_deadline']

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [require_perm('view_incidents')()]
        return [require_perm('create_incident')()]

    def get_queryset(self):
        return Incident.objects.select_related('asset', 'created_by', 'assigned_to').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return IncidentCreateSerializer
        return IncidentListSerializer


class IncidentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Incident.objects.select_related(
        'asset', 'created_by', 'assigned_to',
    ).prefetch_related('logs__actor')

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [require_perm('view_incidents')()]
        return [require_perm('transition_incident')()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return IncidentUpdateSerializer
        return IncidentDetailSerializer


class IncidentTransitionView(APIView):
    permission_classes = [require_perm('transition_incident')]

    def post(self, request, pk):
        incident = get_object_or_404(Incident, pk=pk)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['new_status']
        assigned_to_id = serializer.validated_data.get('assigned_to')

        # Validate assigned_to against StatusRoleMapping if present
        if assigned_to_id is not None:
            assignee = User.objects.filter(pk=assigned_to_id, is_active=True).first()
            if not assignee:
                return Response({'detail': 'User not found or inactive.'}, status=status.HTTP_400_BAD_REQUEST)
            mapping = StatusRoleMapping.objects.filter(status=new_status).select_related('role').first()
            if mapping and assignee.role_id != mapping.role_id:
                return Response(
                    {'detail': f'Assignee must have the "{mapping.role.name}" role for status {new_status}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Set assignment + log it
            old_assignee = incident.assigned_to
            incident.assigned_to = assignee
            incident.save(update_fields=['assigned_to'])
            if old_assignee != assignee:
                IncidentLog.objects.create(
                    incident=incident,
                    actor=request.user,
                    action_type=IncidentLog.ActionType.ASSIGNMENT,
                    old_value=old_assignee.username if old_assignee else '',
                    new_value=assignee.username,
                )

        try:
            incident.transition_to(
                new_status=new_status,
                actor=request.user,
                comment=serializer.validated_data.get('comment', ''),
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(IncidentDetailSerializer(incident).data)


class IncidentLogsView(APIView):

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [require_perm('view_incidents')()]
        return [require_perm('comment_incident')()]

    def get(self, request, pk):
        logs = IncidentLog.objects.filter(incident_id=pk).select_related('actor')
        return Response(IncidentLogSerializer(logs, many=True).data)

    def post(self, request, pk):
        incident = get_object_or_404(Incident, pk=pk)
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = IncidentLog.objects.create(
            incident=incident,
            actor=request.user,
            action_type=IncidentLog.ActionType.COMMENT,
            comment=serializer.validated_data['comment'],
        )
        return Response(IncidentLogSerializer(log).data, status=status.HTTP_201_CREATED)


class StatusRoleMappingListView(generics.ListCreateAPIView):
    queryset = StatusRoleMapping.objects.select_related('role').all()
    permission_classes = [require_perm('transition_incident')]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StatusRoleMappingWriteSerializer
        return StatusRoleMappingSerializer


class StatusRoleMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StatusRoleMapping.objects.select_related('role').all()
    permission_classes = [require_perm('transition_incident')]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return StatusRoleMappingWriteSerializer
        return StatusRoleMappingSerializer


class EligibleAssigneesView(APIView):
    permission_classes = [require_perm('view_incidents')]

    def get(self, request):
        target_status = request.query_params.get('status')
        mapping = None
        if target_status:
            mapping = StatusRoleMapping.objects.filter(status=target_status).first()

        qs = User.objects.filter(is_active=True).select_related('role')
        if mapping:
            qs = qs.filter(role_id=mapping.role_id)

        data = [
            {
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role_name': u.role.name if u.role else '',
            }
            for u in qs
        ]
        return Response(data)
