from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import require_perm

from .models import NotificationSettings
from .serializers import NotificationSettingsSerializer


class NotificationSettingsView(APIView):
    permission_classes = [require_perm('manage_notifications')]

    @extend_schema(
        tags=['notifications'],
        summary='Get notification settings',
        description='Returns the global notification configuration (SMTP, Slack, Teams). Requires `manage_notifications`.',
        responses={200: NotificationSettingsSerializer},
    )
    def get(self, request):
        obj = NotificationSettings.get()
        return Response(NotificationSettingsSerializer(obj).data)

    @extend_schema(
        tags=['notifications'],
        summary='Update notification settings',
        description='Update one or more notification configuration fields. Requires `manage_notifications`.',
        request=NotificationSettingsSerializer,
        responses={200: NotificationSettingsSerializer},
    )
    def put(self, request):
        obj = NotificationSettings.get()
        serializer = NotificationSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
