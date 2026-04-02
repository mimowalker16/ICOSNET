"""
Data migration: seed AppPermission rows, create the ADMIN system role,
and populate the new role_fk column based on the old role CharField.
"""

from django.db import migrations

ITSM_PERMISSIONS = [
    ('view_assets', 'View Assets'),
    ('create_asset', 'Create Asset'),
    ('edit_asset', 'Edit Asset'),
    ('delete_asset', 'Delete Asset'),
    ('view_incidents', 'View Incidents'),
    ('create_incident', 'Create Incident'),
    ('assign_incident', 'Assign Incident'),
    ('transition_incident', 'Transition Incident Status'),
    ('close_incident', 'Close Incident'),
    ('comment_incident', 'Comment on Incident'),
    ('view_analytics', 'View Analytics'),
    ('manage_notifications', 'Manage Notification Settings'),
    ('manage_users', 'Manage Users & Roles'),
]


def seed_permissions_and_roles(apps, schema_editor):
    AppPermission = apps.get_model('users', 'AppPermission')
    Role = apps.get_model('users', 'Role')
    User = apps.get_model('users', 'User')

    # 1. Seed permission catalog
    perm_objs = []
    for codename, name in ITSM_PERMISSIONS:
        obj, _ = AppPermission.objects.get_or_create(
            codename=codename, defaults={'name': name}
        )
        perm_objs.append(obj)

    # 2. Create the Admin system role with all permissions
    admin_role, _ = Role.objects.get_or_create(
        name='Admin',
        defaults={
            'description': 'Full access — bypasses all permission checks.',
            'is_admin': True,
            'is_system': True,
        },
    )
    admin_role.permissions.set(perm_objs)

    # 3. Populate role_fk for ALL existing users → Admin role
    User.objects.filter(role_fk__isnull=True).update(role_fk=admin_role)


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_role_models'),
    ]

    operations = [
        migrations.RunPython(seed_permissions_and_roles, reverse_noop),
    ]
