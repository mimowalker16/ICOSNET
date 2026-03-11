from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        TECHNICIAN = 'TECHNICIAN', 'Technicien'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TECHNICIAN)
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ['email', 'role']

    class Meta:
        db_table = 'users'

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    def __str__(self):
        return f"{self.username} ({self.role})"
