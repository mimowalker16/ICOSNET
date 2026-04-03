from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.permissions import SAFE_METHODS

from users.permissions import require_perm

from .models import Asset, AssetStatusLog
from .serializers import AssetSerializer, AssetStatusLogSerializer


@extend_schema_view(
    list=extend_schema(
        tags=['assets'],
        summary='List assets',
        description='Returns all monitored assets. Supports filtering by `asset_type`, `check_type`, and `is_active`.',
        responses={200: AssetSerializer},
    ),
    create=extend_schema(
        tags=['assets'],
        summary='Create asset',
        request=AssetSerializer,
        responses={201: AssetSerializer},
    ),
)
class AssetListCreateView(generics.ListCreateAPIView):
    queryset = Asset.objects.select_related('created_by').prefetch_related('status_logs')
    serializer_class = AssetSerializer
    filterset_fields = ['asset_type', 'check_type', 'is_active']
    search_fields = ['name', 'ip_address_or_url', 'description']
    ordering_fields = ['name', 'created_at', 'asset_type']

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [require_perm('view_assets')()]
        return [require_perm('create_asset')()]


@extend_schema_view(
    retrieve=extend_schema(tags=['assets'], summary='Get asset', responses={200: AssetSerializer}),
    update=extend_schema(tags=['assets'], summary='Update asset (full)', request=AssetSerializer, responses={200: AssetSerializer}),
    partial_update=extend_schema(tags=['assets'], summary='Update asset (partial)', request=AssetSerializer, responses={200: AssetSerializer}),
    destroy=extend_schema(tags=['assets'], summary='Delete asset', responses={204: None}),
)
class AssetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Asset.objects.select_related('created_by').prefetch_related('status_logs')
    serializer_class = AssetSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [require_perm('view_assets')()]
        if self.request.method == 'DELETE':
            return [require_perm('delete_asset')()]
        return [require_perm('edit_asset')()]


@extend_schema_view(
    list=extend_schema(
        tags=['assets'],
        summary='Asset status history',
        description='Returns all status-check logs for the specified asset. Supports filtering by `status`. Requires `view_asset_logs` permission.',
        responses={200: AssetStatusLogSerializer},
    ),
)
class AssetStatusHistoryView(generics.ListAPIView):
    serializer_class = AssetStatusLogSerializer
    permission_classes = [require_perm('view_asset_logs')]
    pagination_class = None
    filterset_fields = ['status']
    ordering_fields = ['checked_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AssetStatusLog.objects.none()
        return AssetStatusLog.objects.filter(asset_id=self.kwargs['pk'])
