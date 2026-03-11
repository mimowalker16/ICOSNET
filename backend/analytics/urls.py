from django.urls import path

from .views import IncidentsBySeverityView, MTTRView, TopFailingAssetsView, UptimeView

urlpatterns = [
    path('mttr/', MTTRView.as_view(), name='analytics-mttr'),
    path('top-failing/', TopFailingAssetsView.as_view(), name='analytics-top-failing'),
    path('uptime/', UptimeView.as_view(), name='analytics-uptime'),
    path('incidents-by-severity/', IncidentsBySeverityView.as_view(), name='analytics-incidents-by-severity'),
]
