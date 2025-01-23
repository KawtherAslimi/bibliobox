# Generated by Django 5.1.1 on 2025-01-10 23:54

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='box',
            name='availability_date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='box',
            name='availability_time',
            field=models.TimeField(default='08:30'),
        ),
    ]
