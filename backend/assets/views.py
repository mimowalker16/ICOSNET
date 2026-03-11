from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsAdminOrReadOnly

from .models import Asset, AssetStatusLog
from .serializers import AssetSerializer, AssetStatusLogSerializer


class AssetListCreateView(generics.ListCreateAPIView):
    queryset = Asset.objects.select_related('created_by').prefetch_related('status_logs')
    serializer_class = AssetSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['asset_type', 'check_type', 'is_active']
    search_fields = ['name', 'ip_address_or_url', 'description']
    ordering_fields = ['name', 'created_at', 'asset_type']


class AssetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Asset.objects.select_related('created_by').prefetch_related('status_logs')
    serializer_class = AssetSerializer
    permission_classes = [IsAdminOrReadOnly]


class AssetStatusHistoryView(generics.ListAPIView):
    serializer_class = AssetStatusLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']
    ordering_fields = ['checked_at']

    def get_queryset(self):
        return AssetStatusLog.objects.filter(asset_id=self.kwargs['pk'])
