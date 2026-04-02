from django.contrib.auth.models import AbstractUser
from django.db import models


class AppPermission(models.Model):
    """Catalog of ITSM-specific permissions (seeded via data migration)."""

    codename = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'app_permissions'
        ordering = ['codename']

    def __str__(self):
        return self.codename


class Role(models.Model):
    """Named role carrying a set of ITSM permissions."""

    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    is_admin = models.BooleanField(
        default=False,
        help_text='Bypass all permission checks.',
    )
    is_system = models.BooleanField(
        default=False,
        help_text='System roles cannot be deleted via the API.',
    )
    permissions = models.ManyToManyField(
        AppPermission,
        blank=True,
        related_name='roles',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roles'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='users',
    )
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'

    @property
    def is_admin(self):
        return self.role.is_admin if self.role else False

    def __str__(self):
        role_name = self.role.name if self.role else 'No Role'
        return f"{self.username} ({role_name})"
