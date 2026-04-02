from django.urls import path

from .views import (
    EligibleAssigneesView,
    IncidentDetailView,
    IncidentListCreateView,
    IncidentLogsView,
    IncidentTransitionView,
    StatusRoleMappingDetailView,
    StatusRoleMappingListView,
)

urlpatterns = [
    path('', IncidentListCreateView.as_view(), name='incident-list-create'),
    path('<int:pk>/', IncidentDetailView.as_view(), name='incident-detail'),
    path('<int:pk>/transition/', IncidentTransitionView.as_view(), name='incident-transition'),
    path('<int:pk>/logs/', IncidentLogsView.as_view(), name='incident-logs'),
    path('status-role-mappings/', StatusRoleMappingListView.as_view(), name='status-role-mapping-list'),
    path('status-role-mappings/<int:pk>/', StatusRoleMappingDetailView.as_view(), name='status-role-mapping-detail'),
    path('eligible-assignees/', EligibleAssigneesView.as_view(), name='eligible-assignees'),
]
