"""
Seed the assets table with a realistic ICOSNET ISP infrastructure inventory.

Usage:
    python manage.py seed_assets            # insert only
    python manage.py seed_assets --reset    # wipe existing assets first
"""
from django.core.management.base import BaseCommand

ASSETS = [
    # ── Servers ──────────────────────────────────────────────────────────────
    {
        'name': 'SRV-RADIUS-01',
        'description': 'Primary RADIUS authentication server',
        'ip_address_or_url': '192.168.10.10',
        'asset_type': 'SERVER',
        'check_type': 'TCP',
        'check_port': 1812,
        'check_interval_minutes': 5,
    },
    {
        'name': 'SRV-DNS-01',
        'description': 'Primary internal DNS server',
        'ip_address_or_url': '192.168.10.11',
        'asset_type': 'SERVER',
        'check_type': 'TCP',
        'check_port': 53,
        'check_interval_minutes': 5,
    },
    {
        'name': 'SRV-MAIL-01',
        'description': 'Primary mail relay (Postfix)',
        'ip_address_or_url': '192.168.10.12',
        'asset_type': 'SERVER',
        'check_type': 'TCP',
        'check_port': 25,
        'check_interval_minutes': 5,
    },
    {
        'name': 'SRV-WEB-01',
        'description': 'Internal intranet portal',
        'ip_address_or_url': 'http://intranet.icosnet.dz',
        'asset_type': 'SERVER',
        'check_type': 'HTTP_GET',
        'check_port': None,
        'check_interval_minutes': 5,
    },
    {
        'name': 'SRV-BACKUP-01',
        'description': 'Nightly backup server (Bacula)',
        'ip_address_or_url': '192.168.10.14',
        'asset_type': 'SERVER',
        'check_type': 'PING',
        'check_port': None,
        'check_interval_minutes': 10,
    },
    # ── Routers ───────────────────────────────────────────────────────────────
    {
        'name': 'RTR-CORE-01',
        'description': 'Core aggregation router (HQ)',
        'ip_address_or_url': '192.168.1.1',
        'asset_type': 'ROUTER',
        'check_type': 'PING',
        'check_port': None,
        'check_interval_minutes': 3,
    },
    {
        'name': 'RTR-BORDER-01',
        'description': 'Border / Internet peering router',
        'ip_address_or_url': '10.0.0.1',
        'asset_type': 'ROUTER',
        'check_type': 'PING',
        'check_port': None,
        'check_interval_minutes': 3,
    },
    {
        'name': 'RTR-BRANCH-DJN',
        'description': 'Djelfa branch office router',
        'ip_address_or_url': '172.16.1.1',
        'asset_type': 'ROUTER',
        'check_type': 'PING',
        'check_port': None,
        'check_interval_minutes': 5,
    },
    {
        'name': 'RTR-BRANCH-ANN',
        'description': 'Annaba branch office router',
        'ip_address_or_url': '172.16.2.1',
        'asset_type': 'ROUTER',
        'check_type': 'PING',
        'check_port': None,
        'check_interval_minutes': 5,
    },
    # ── APIs ──────────────────────────────────────────────────────────────────
    {
        'name': 'API-BILLING',
        'description': 'Billing & subscription system health endpoint',
        'ip_address_or_url': 'http://billing.icosnet.dz/api/status',
        'asset_type': 'API',
        'check_type': 'HTTP_GET',
        'check_port': None,
        'check_interval_minutes': 5,
    },
    {
        'name': 'API-CRM',
        'description': 'CRM platform health endpoint',
        'ip_address_or_url': 'http://crm.icosnet.dz/api/ping',
        'asset_type': 'API',
        'check_type': 'HTTP_GET',
        'check_port': None,
        'check_interval_minutes': 5,
    },
    {
        'name': 'API-PROVISIONING',
        'description': 'Customer provisioning / activation system',
        'ip_address_or_url': 'http://provisioning.icosnet.dz/health',
        'asset_type': 'API',
        'check_type': 'HTTP_GET',
        'check_port': None,
        'check_interval_minutes': 5,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with ICOSNET infrastructure assets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing assets before seeding',
        )

    def handle(self, *args, **options):
        from assets.models import Asset

        if options['reset']:
            deleted, _ = Asset.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing asset(s).'))

        created = 0
        skipped = 0
        for data in ASSETS:
            _, was_created = Asset.objects.get_or_create(
                name=data['name'],
                defaults=data,
            )
            if was_created:
                created += 1
                self.stdout.write(f"  + {data['name']}")
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone — {created} asset(s) created, {skipped} already existed.'
            )
        )
