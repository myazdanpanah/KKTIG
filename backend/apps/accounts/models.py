from django.contrib.auth.models import AbstractUser
from django.db import models
from .role_filters import RoleFilter


class Company(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    logo = models.ImageField(upload_to="companies/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["name"]
    def __str__(self):
        return self.name


class Division(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="divisions")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    manager = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_divisions")
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="subdivisions")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["company__name", "name"]
        verbose_name_plural = "divisions"
    def __str__(self):
        return f"{self.company.name} - {self.name}"


class CustomRole(models.Model):
    value = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=100)
    color = models.CharField(max_length=50, default='bg-gray-100 text-gray-700')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['label']
    def __str__(self):
        return f"{self.label} ({self.value})"


class Team(models.Model):
    division = models.ForeignKey(Division, on_delete=models.CASCADE, related_name="teams")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    manager = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_teams")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["division__company__name", "division__name", "name"]
    def __str__(self):
        return f"{self.division.company.name} - {self.division.name} - {self.name}"


class User(AbstractUser):
    ROLE_CHOICES = [("finance", "Finance"), ("sales", "Sales"), ("ceo", "CEO"), ("admin", "Admin")]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="sales")
    department = models.CharField(max_length=100, blank=True, default="")
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    division = models.ForeignKey(Division, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="members")
    reports_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="direct_reports")
    # Finance module permission flags
    nexivo_access = models.BooleanField(default=True)
    finance_access = models.BooleanField(default=False)
    can_view_finance = models.BooleanField(default=False)
    can_pay = models.BooleanField(default=False)
    can_issue = models.BooleanField(default=False)
    can_manage_payers = models.BooleanField(default=False)
    can_delete_history = models.BooleanField(default=False)
    can_delete_payment = models.BooleanField(default=False)
    can_export = models.BooleanField(default=False)
    can_submit = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    can_edit_template = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    last_module = models.CharField(max_length=20, blank=True, default="")
    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    @property
    def is_ceo(self):
        return self.role == "ceo"
    @property
    def is_finance(self):
        return self.role == "finance"
    @property
    def is_sales(self):
        return self.role == "sales"
    @property
    def is_admin_user(self):
        return self.role == "admin" or self.is_staff
    def has_finance_perm(self, perm_name):
        if self.role in ('ceo', 'admin') or self.is_staff:
            return True
        return bool(getattr(self, perm_name, False))
    @property
    def module_access(self):
        return {"nexivo": self.nexivo_access, "finance": self.finance_access}
