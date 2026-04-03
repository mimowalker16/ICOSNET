from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Asset, AssetStatusLog


class AssetStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetStatusLog
        fields = ('id', 'status', 'response_time_ms', 'error_message', 'checked_at')


class AssetSerializer(serializers.ModelSerializer):
    latest_status = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Asset
        fields = (
            'id', 'name', 'description', 'ip_address_or_url', 'asset_type',
            'check_type', 'check_port', 'check_interval_minutes', 'is_active',
            'created_by', 'created_by_username', 'created_at', 'updated_at',
            'latest_status',
        )
        read_only_fields = ('id', 'created_by', 'created_by_username', 'created_at', 'updated_at')

    @extend_schema_field(AssetStatusLogSerializer)
    def get_latest_status(self, obj):
        log = obj.status_logs.first()
        return AssetStatusLogSerializer(log).data if log else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
