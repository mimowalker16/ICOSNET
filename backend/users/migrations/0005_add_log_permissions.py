"""
Data migration: seed the two new log-viewing permissions and grant them
to the Admin system role so it continues to have full access.
"""

from django.db import migrations

NEW_PERMISSIONS = [
    ('view_asset_logs', 'View Asset Status Logs'),
    ('view_incident_logs', 'View Incident Activity Logs'),
]


def add_log_permissions(apps, schema_editor):
    AppPermission = apps.get_model('users', 'AppPermission')
    Role = apps.get_model('users', 'Role')

    new_perms = []
    for codename, name in NEW_PERMISSIONS:
        obj, _ = AppPermission.objects.get_or_create(codename=codename, defaults={'name': name})
        new_perms.append(obj)

    # Grant to every admin/system role
    for role in Role.objects.filter(is_admin=True):
        role.permissions.add(*new_perms)


def remove_log_permissions(apps, schema_editor):
    AppPermission = apps.get_model('users', 'AppPermission')
    AppPermission.objects.filter(codename__in=[c for c, _ in NEW_PERMISSIONS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_role_nonnull'),
    ]

    operations = [
        migrations.RunPython(add_log_permissions, remove_log_permissions),
    ]
