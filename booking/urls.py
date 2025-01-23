# booking/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('verification/', views.verification, name='verification'),
    path('verify-code/', views.verify_code, name='verify_code'),
    path('reservation/', views.reservation, name='reservation'),
    path('historique/', views.historique, name='historique'),
    path('api/get-student-number/', views.get_student_number, name='get_student_number'),
    path('api/available-boxes/', views.get_available_boxes, name='available_boxes'),
    path('api/make-reservation/', views.make_reservation, name='make_reservation'),
    path('api/get-user-email/', views.get_user_email, name='get_user_email'),
    path('api/reservation-history/', views.reservation_history_api, name='reservation_history_api'),
    path('api/cancel-reservation/', views.cancel_reservation_api, name='cancel_reservation_api'),


]
