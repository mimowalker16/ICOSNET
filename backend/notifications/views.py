from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin

from .models import NotificationSettings
from .serializers import NotificationSettingsSerializer


class NotificationSettingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        obj = NotificationSettings.get()
        return Response(NotificationSettingsSerializer(obj).data)

    def put(self, request):
        obj = NotificationSettings.get()
        serializer = NotificationSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
