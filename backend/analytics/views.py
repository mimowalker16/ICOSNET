from datetime import timedelta

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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

    permission_classes = [IsAuthenticated]

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

    permission_classes = [IsAuthenticated]

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

    permission_classes = [IsAuthenticated]

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

    permission_classes = [IsAuthenticated]

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
