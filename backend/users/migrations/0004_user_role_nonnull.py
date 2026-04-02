"""
Drop the old CharField 'role', rename 'role_fk' → 'role', and make it non-nullable.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_seed_roles'),
    ]

    operations = [
        # 1. Drop the old CharField role
        migrations.RemoveField(
            model_name='user',
            name='role',
        ),
        # 2. Rename role_fk → role
        migrations.RenameField(
            model_name='user',
            old_name='role_fk',
            new_name='role',
        ),
        # 3. Make non-nullable & set related_name
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='users',
                to='users.role',
            ),
        ),
    ]
