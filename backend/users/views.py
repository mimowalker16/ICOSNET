from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
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

    @extend_schema(
        tags=['auth'],
        summary='Get current user',
        description='Returns the profile of the currently authenticated user.',
        responses={200: MeSerializer},
    )
    def get(self, request):
        return Response(MeSerializer(request.user).data)


@extend_schema_view(
    list=extend_schema(
        tags=['users'],
        summary='List users',
        description=(
            'Returns all users (admin only). '
            'Any authenticated user may pass `?permission=<codename>` to get users who have that permission '
            '(used by incident-assignment pickers).'
        ),
        parameters=[
            OpenApiParameter(
                name='permission',
                description='Filter by permission codename. When set, any authenticated user may call this endpoint.',
                required=False,
                type=str,
            ),
        ],
        responses={200: UserSerializer(many=True)},
    ),
    create=extend_schema(
        tags=['users'],
        summary='Create user',
        description='Create a new user account. Admin only.',
        request=UserCreateSerializer,
        responses={201: UserSerializer},
    ),
)
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


@extend_schema_view(
    retrieve=extend_schema(tags=['users'], summary='Get user', responses={200: UserSerializer}),
    update=extend_schema(tags=['users'], summary='Update user (full)', request=UserUpdateSerializer, responses={200: UserSerializer}),
    partial_update=extend_schema(tags=['users'], summary='Update user (partial)', request=UserUpdateSerializer, responses={200: UserSerializer}),
)
class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related('role').all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


# ── Permission & Role endpoints ────────────────────────────────────

@extend_schema_view(
    list=extend_schema(
        tags=['permissions'],
        summary='List ITSM permissions',
        description='Returns all available ITSM permission codenames. Admin only.',
        responses={200: AppPermissionSerializer},
    ),
)
class AppPermissionListView(generics.ListAPIView):
    queryset = AppPermission.objects.all()
    serializer_class = AppPermissionSerializer
    permission_classes = [IsAdmin]
    pagination_class = None


@extend_schema_view(
    list=extend_schema(
        tags=['roles'],
        summary='List roles',
        description='Returns all roles with their assigned permissions. Admin only.',
        responses={200: RoleSerializer},
    ),
    create=extend_schema(
        tags=['roles'],
        summary='Create role',
        description='Create a new role and assign permissions to it. Admin only.',
        request=RoleWriteSerializer,
        responses={201: RoleSerializer},
    ),
)
class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.prefetch_related('permissions').all()
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RoleWriteSerializer
        return RoleSerializer


@extend_schema_view(
    retrieve=extend_schema(tags=['roles'], summary='Get role', responses={200: RoleSerializer}),
    update=extend_schema(tags=['roles'], summary='Update role (full)', request=RoleWriteSerializer, responses={200: RoleSerializer}),
    partial_update=extend_schema(tags=['roles'], summary='Update role (partial)', request=RoleWriteSerializer, responses={200: RoleSerializer}),
    destroy=extend_schema(tags=['roles'], summary='Delete role', responses={204: None}),
)
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
