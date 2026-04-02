from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Grants access only to users whose role has is_admin=True."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


class IsAdminOrReadOnly(BasePermission):
    """Allows GET/HEAD/OPTIONS to any authenticated user; write ops require admin."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_admin


def require_perm(codename: str):
    """
    Factory that returns a DRF BasePermission class enforcing a single
    ITSM permission codename.  Admin roles bypass the check.
    """

    class _Perm(BasePermission):
        _codename = codename

        def has_permission(self, request, view):
            user = request.user
            if not (user and user.is_authenticated):
                return False
            role = getattr(user, 'role', None)
            if role is None:
                return False
            if role.is_admin:
                return True
            return role.permissions.filter(codename=self._codename).exists()

    _Perm.__name__ = f'HasPerm_{codename}'
    _Perm.__qualname__ = _Perm.__name__
    return _Perm
