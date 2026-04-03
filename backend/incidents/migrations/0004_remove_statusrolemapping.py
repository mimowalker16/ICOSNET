from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('incidents', '0003_statusrolemapping'),
    ]

    operations = [
        migrations.DeleteModel(
            name='StatusRoleMapping',
        ),
    ]
