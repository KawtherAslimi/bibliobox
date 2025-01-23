# booking/models.py
from django.db import models
from django.contrib.auth.models import User

class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    email = models.EmailField(unique=True)
    student_number = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email

class Box(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class TimeSlot(models.Model):
    box = models.ForeignKey(Box, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    start_time = models.TimeField(db_index=True)
    end_time = models.TimeField(db_index=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.box.name} - {self.date} {self.start_time}-{self.end_time}"

class Reservation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    time_slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE, null=True, blank=True)
    email = models.EmailField(default='unknown@parisnanterre.fr')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.user:
            return f"{self.user.username} - {self.time_slot.box.name} - {self.time_slot.date} {self.time_slot.start_time}-{self.time_slot.end_time}"
        return f"[NoUser] - {self.time_slot.box.name} - {self.time_slot.date} {self.time_slot.start_time}-{self.time_slot.end_time}"

class VerificationCode(models.Model):
    email = models.EmailField(unique=True)
    generated_code = models.CharField(max_length=4, null=True, blank=True)
    entered_code = models.CharField(max_length=4, null=True, blank=True)

    def __str__(self):
        return f"Code pour {self.email}"
