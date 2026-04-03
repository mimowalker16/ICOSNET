from datetime import timedelta

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import require_perm

from assets.models import Asset, AssetStatusLog
from incidents.models import Incident


def _since(period_str: str):
    """Convert a period string like '30d' or '3m' to a timezone-aware datetime."""
    s = period_str.strip()
    if s.endswith('m'):
        days = int(s[:-1]) * 30
    elif s.endswith('d'):
        days = int(s[:-1])
    else:
        days = int(s)
    return timezone.now() - timedelta(days=days)


class MTTRView(APIView):
    """Mean Time To Repair — average hours from creation to resolution."""

    permission_classes = [require_perm('view_analytics')]

    @extend_schema(
        tags=['analytics'],
        summary='Mean Time To Repair (MTTR)',
        description='Returns the average resolution time in hours for the given period.',
        parameters=[
            OpenApiParameter(name='period', description='Look-back window, e.g. `30d` (days) or `3m` (months). Defaults to `30d`.', required=False, type=str),
        ],
        responses={200: inline_serializer(name='MTTRResponse', fields={
            'period': serializers.CharField(),
            'mttr_hours': serializers.FloatField(allow_null=True),
            'total_resolved': serializers.IntegerField(),
        })},
    )
    def get(self, request):
        period = request.query_params.get('period', '30d')
        since = _since(period)
        qs = Incident.objects.filter(
            resolved_at__isnull=False,
            created_at__gte=since,
        ).annotate(
            duration=ExpressionWrapper(
                F('resolved_at') - F('created_at'),
                output_field=DurationField(),
            )
        )
        avg = qs.aggregate(avg=Avg('duration'))['avg']
        mttr_hours = round(avg.total_seconds() / 3600, 2) if avg else None
        return Response({
            'period': period,
            'mttr_hours': mttr_hours,
            'total_resolved': qs.count(),
        })


class TopFailingAssetsView(APIView):
    """Assets with the most incidents in the given period."""

    permission_classes = [require_perm('view_analytics')]

    @extend_schema(
        tags=['analytics'],
        summary='Top failing assets',
        description='Returns assets with the highest incident counts in the given period.',
        parameters=[
            OpenApiParameter(name='period', description='Look-back window. Defaults to `30d`.', required=False, type=str),
            OpenApiParameter(name='limit', description='Number of assets to return. Defaults to `5`.', required=False, type=int),
        ],
        responses={200: inline_serializer(name='TopFailingAssetItem', fields={
            'asset__id': serializers.IntegerField(),
            'asset__name': serializers.CharField(),
            'asset__asset_type': serializers.CharField(),
            'incident_count': serializers.IntegerField(),
        }, many=True)},
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        period = request.query_params.get('period', '30d')
        since = _since(period)
        data = (
            Incident.objects
            .filter(asset__isnull=False, created_at__gte=since)
            .values('asset__id', 'asset__name', 'asset__asset_type')
            .annotate(incident_count=Count('id'))
            .order_by('-incident_count')[:limit]
        )
        return Response(list(data))


class UptimeView(APIView):
    """Uptime percentage per active asset over the given period."""

    permission_classes = [require_perm('view_analytics')]

    @extend_schema(
        tags=['analytics'],
        summary='Asset uptime',
        description='Returns uptime percentages for all active assets based on status-check logs in the given period.',
        parameters=[
            OpenApiParameter(name='period', description='Look-back window. Defaults to `30d`.', required=False, type=str),
        ],
        responses={200: inline_serializer(name='UptimeAsset', fields={
            'asset_id': serializers.IntegerField(),
            'asset_name': serializers.CharField(),
            'asset_type': serializers.CharField(),
            'total_checks': serializers.IntegerField(),
            'up_checks': serializers.IntegerField(),
            'uptime_pct': serializers.FloatField(allow_null=True),
        }, many=True)},
    )
    def get(self, request):
        period = request.query_params.get('period', '30d')
        since = _since(period)
        result = []
        for asset in Asset.objects.filter(is_active=True):
            logs = AssetStatusLog.objects.filter(asset=asset, checked_at__gte=since)
            total = logs.count()
            up = logs.filter(status='UP').count()
            result.append({
                'asset_id': asset.id,
                'asset_name': asset.name,
                'asset_type': asset.asset_type,
                'total_checks': total,
                'up_checks': up,
                'uptime_pct': round((up / total) * 100, 2) if total else None,
            })
        return Response(result)


class IncidentsBySeverityView(APIView):
    """Incident counts grouped by severity for the given period."""

    permission_classes = [require_perm('view_analytics')]

    @extend_schema(
        tags=['analytics'],
        summary='Incidents by severity',
        description='Returns incident counts grouped by severity level for the given period.',
        parameters=[
            OpenApiParameter(name='period', description='Look-back window. Defaults to `30d`.', required=False, type=str),
        ],
        responses={200: inline_serializer(name='SeverityBreakdown', fields={
            'severity': serializers.CharField(),
            'count': serializers.IntegerField(),
        }, many=True)},
    )
    def get(self, request):
        period = request.query_params.get('period', '30d')
        since = _since(period)
        data = (
            Incident.objects
            .filter(created_at__gte=since)
            .values('severity')
            .annotate(count=Count('id'))
            .order_by('severity')
        )
        return Response(list(data))
