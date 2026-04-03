from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import require_perm

from .models import Incident, IncidentLog
from .serializers import (
    CommentSerializer,
    IncidentCreateSerializer,
    IncidentDetailSerializer,
    IncidentListSerializer,
    IncidentLogSerializer,
    IncidentUpdateSerializer,
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
        new_assigned_to = None

        if assigned_to_id:
            try:
                assignee = User.objects.select_related('role').get(pk=assigned_to_id)
            except User.DoesNotExist:
                return Response({'assigned_to': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

            role = getattr(assignee, 'role', None)
            if role is None:
                return Response(
                    {'assigned_to': 'Assignee has no role assigned.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if new_status == Incident.Status.ASSIGNED:
                required_perm = 'assign_incident'
            else:  # IN_PROGRESS
                required_perm = 'transition_incident'

            has_perm = role.is_admin or role.permissions.filter(codename=required_perm).exists()
            if not has_perm:
                return Response(
                    {'assigned_to': f"This user does not have the '{required_perm}' permission."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_assigned_to = assignee

        try:
            incident.transition_to(
                new_status=new_status,
                actor=request.user,
                comment=serializer.validated_data.get('comment', ''),
                new_assigned_to=new_assigned_to,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(IncidentDetailSerializer(incident).data)


class IncidentLogsView(APIView):
    pagination_class = None

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [require_perm('view_incident_logs')()]
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
