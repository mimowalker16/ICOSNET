from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppPermission, Role, User
from .permissions import IsAdmin
from .serializers import (
    AppPermissionSerializer,
    MeSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class UserListCreateView(generics.ListCreateAPIView):

    def get_permissions(self):
        # Allow any authenticated user to GET a permission-filtered list (used by incident assignment pickers)
        if self.request.method == 'GET' and self.request.query_params.get('permission'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = User.objects.select_related('role').order_by('username')
        permission = self.request.query_params.get('permission')
        if permission:
            qs = qs.filter(role__permissions__codename=permission)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related('role').all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


# ── Permission & Role endpoints ────────────────────────────────────

class AppPermissionListView(generics.ListAPIView):
    queryset = AppPermission.objects.all()
    serializer_class = AppPermissionSerializer
    permission_classes = [IsAdmin]
    pagination_class = None


class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.prefetch_related('permissions').all()
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RoleWriteSerializer
        return RoleSerializer


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.prefetch_related('permissions').all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return RoleWriteSerializer
        return RoleSerializer

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return Response(
                {'detail': 'System roles cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role.users.exists():
            return Response(
                {'detail': 'Cannot delete a role that still has users assigned.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
