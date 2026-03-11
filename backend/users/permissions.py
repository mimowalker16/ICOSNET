from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Grants access only to users with the ADMIN role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


class IsAdminOrReadOnly(BasePermission):
    """Allows GET/HEAD/OPTIONS to any authenticated user; write ops require ADMIN."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_admin
