# Generated by Django 5.1.1 on 2025-01-12 11:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking', '0003_rename_reservation_date_reservation_date_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='user',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='box',
            name='availability_date',
            field=models.DateField(db_index=True),
        ),
        migrations.AlterField(
            model_name='box',
            name='availability_time',
            field=models.TimeField(db_index=True),
        ),
        migrations.AlterField(
            model_name='box',
            name='name',
            field=models.CharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='student_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
