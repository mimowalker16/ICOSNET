from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .app_permissions import ALL_CODENAMES
from .models import AppPermission, Role, User


# ── Permission & Role serializers ──────────────────────────────────

class AppPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppPermission
        fields = ('id', 'codename', 'name')


class RoleSerializer(serializers.ModelSerializer):
    permissions = AppPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'is_admin', 'is_system', 'permissions', 'created_at')
        read_only_fields = ('id', 'is_admin', 'is_system', 'created_at')


class RoleWriteSerializer(serializers.ModelSerializer):
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=AppPermission.objects.all(),
        many=True,
        source='permissions',
    )

    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'permission_ids')

    def create(self, validated_data):
        perms = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        perms = validated_data.pop('permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if perms is not None:
            instance.permissions.set(perms)
        return instance


# ── User serializers ───────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'first_name', 'last_name', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role', 'first_name', 'last_name', 'is_active')

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())

    class Meta:
        model = User
        fields = ('email', 'role', 'first_name', 'last_name', 'is_active')


class MeSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'first_name', 'last_name', 'permissions')

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_permissions(self, obj):
        if obj.role and obj.role.is_admin:
            return ALL_CODENAMES
        if obj.role:
            return list(obj.role.permissions.values_list('codename', flat=True))
        return []
