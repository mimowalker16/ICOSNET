"""
Single source of truth for ITSM permission codenames.
Used by data migrations, the permission factory, and admin seeding.
"""

ITSM_PERMISSIONS = [
    ('view_assets', 'View Assets'),
    ('create_asset', 'Create Asset'),
    ('edit_asset', 'Edit Asset'),
    ('delete_asset', 'Delete Asset'),
    ('view_asset_logs', 'View Asset Status Logs'),
    ('view_incidents', 'View Incidents'),
    ('create_incident', 'Create Incident'),
    ('assign_incident', 'Assign Incident'),
    ('transition_incident', 'Transition Incident Status'),
    ('close_incident', 'Close Incident'),
    ('comment_incident', 'Comment on Incident'),
    ('view_incident_logs', 'View Incident Activity Logs'),
    ('view_analytics', 'View Analytics'),
    ('manage_notifications', 'Manage Notification Settings'),
    ('manage_users', 'Manage Users & Roles'),
]

ALL_CODENAMES = [code for code, _ in ITSM_PERMISSIONS]
