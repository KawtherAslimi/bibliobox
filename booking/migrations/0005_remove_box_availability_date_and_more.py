# Generated by Django 5.1.1 on 2025-01-12 16:26

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking', '0004_studentprofile_user_alter_box_availability_date_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='box',
            name='availability_date',
        ),
        migrations.RemoveField(
            model_name='box',
            name='availability_time',
        ),
        migrations.RemoveField(
            model_name='box',
            name='is_available',
        ),
        migrations.RemoveField(
            model_name='reservation',
            name='box',
        ),
        migrations.RemoveField(
            model_name='reservation',
            name='date',
        ),
        migrations.RemoveField(
            model_name='reservation',
            name='end_time',
        ),
        migrations.RemoveField(
            model_name='reservation',
            name='start_time',
        ),
        migrations.CreateModel(
            name='TimeSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True)),
                ('start_time', models.TimeField(db_index=True)),
                ('end_time', models.TimeField(db_index=True)),
                ('is_available', models.BooleanField(default=True)),
                ('box', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='booking.box')),
            ],
        ),
        migrations.AddField(
            model_name='reservation',
            name='time_slot',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='booking.timeslot'),
        ),
    ]
