from django.contrib import admin
from django.urls import include, path

from users.urls import auth_urlpatterns, permission_urlpatterns, role_urlpatterns, user_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth
    path('api/auth/', include(auth_urlpatterns)),
    # Resources
    path('api/users/', include(user_urlpatterns)),
    path('api/permissions/', include(permission_urlpatterns)),
    path('api/roles/', include(role_urlpatterns)),
    path('api/assets/', include('assets.urls')),
    path('api/incidents/', include('incidents.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notifications/', include('notifications.urls')),
]
