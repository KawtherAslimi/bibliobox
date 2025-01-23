
# Register your models here.
from django.contrib import admin
from .models import VerificationCode, Reservation

admin.site.register(VerificationCode)
admin.site.register(Reservation)

