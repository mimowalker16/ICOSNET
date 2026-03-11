from django.contrib import admin

from .models import Asset, AssetStatusLog


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'asset_type', 'check_type', 'ip_address_or_url', 'is_active', 'created_at')
    list_filter = ('asset_type', 'check_type', 'is_active')
    search_fields = ('name', 'ip_address_or_url')


@admin.register(AssetStatusLog)
class AssetStatusLogAdmin(admin.ModelAdmin):
    list_display = ('asset', 'status', 'response_time_ms', 'checked_at')
    list_filter = ('status', 'asset')
    readonly_fields = ('checked_at',)
