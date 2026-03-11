from django.urls import path

from .views import AssetDetailView, AssetListCreateView, AssetStatusHistoryView

urlpatterns = [
    path('', AssetListCreateView.as_view(), name='asset-list-create'),
    path('<int:pk>/', AssetDetailView.as_view(), name='asset-detail'),
    path('<int:pk>/status-history/', AssetStatusHistoryView.as_view(), name='asset-status-history'),
]
