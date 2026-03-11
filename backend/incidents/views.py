from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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


class IncidentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'severity', 'assigned_to', 'asset', 'source']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'severity', 'sla_deadline']

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
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return IncidentUpdateSerializer
        return IncidentDetailSerializer


class IncidentTransitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        incident = get_object_or_404(Incident, pk=pk)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            incident.transition_to(
                new_status=serializer.validated_data['new_status'],
                actor=request.user,
                comment=serializer.validated_data.get('comment', ''),
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(IncidentDetailSerializer(incident).data)


class IncidentLogsView(APIView):
    permission_classes = [IsAuthenticated]

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
