from django.urls import path

from .views import IncidentDetailView, IncidentListCreateView, IncidentLogsView, IncidentTransitionView

urlpatterns = [
    path('', IncidentListCreateView.as_view(), name='incident-list-create'),
    path('<int:pk>/', IncidentDetailView.as_view(), name='incident-detail'),
    path('<int:pk>/transition/', IncidentTransitionView.as_view(), name='incident-transition'),
    path('<int:pk>/logs/', IncidentLogsView.as_view(), name='incident-logs'),
]
