from django.core.management.base import BaseCommand

from incidents.models import SLAPolicy


class Command(BaseCommand):
    help = 'Seed the SLA policies table with default values'

    def handle(self, *args, **options):
        defaults = [
            ('CRITICAL', 1),
            ('HIGH', 4),
            ('MEDIUM', 8),
            ('LOW', 24),
        ]
        for severity, hours in defaults:
            obj, created = SLAPolicy.objects.update_or_create(
                severity=severity,
                defaults={'resolution_hours': hours},
            )
            verb = 'Created' if created else 'Updated'
            self.stdout.write(f"  {verb}: {severity} = {hours}h")

        self.stdout.write(self.style.SUCCESS('SLA policies seeded successfully.'))
