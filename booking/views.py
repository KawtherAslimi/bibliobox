# booking/views.py

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.core.mail import send_mail
from django.utils.crypto import get_random_string

import random
import json
from datetime import datetime, timedelta, date, time
from django.utils.dateparse import parse_date, parse_time
from django.utils import timezone

from django.contrib.auth import login
from django.views.decorators.http import require_GET, require_POST
from django.db import transaction
from django.db.models import Q
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from .models import (
    VerificationCode,
    Reservation,
    StudentProfile,
    Box,
    TimeSlot,
)

import random
from django.shortcuts import render, redirect
from django.core.mail import send_mail
from django.contrib import messages
from .models import VerificationCode

def index(request):
    """
    Page d'accueil : 
    - L'étudiant saisit son email universitaire.
    - On génère un code de vérification (4 chiffres) envoyé par mail au format HTML.
    """
    if request.method == "POST":
        email = request.POST.get('email', '').strip()

        # Vérification : champ non vide
        if not email:
            messages.error(request, "Veuillez entrer une adresse email.")
            return redirect('index')

        # Vérification : email universitaire
        if not email.endswith("@parisnanterre.fr"):
            messages.error(request, "L'adresse email doit être universitaire (@parisnanterre.fr).")
            return redirect('index')

        # Générer un code à 4 chiffres
        code = str(random.randint(1000, 9999))

        # Mettre à jour ou créer l'enregistrement dans la table VerificationCode
        VerificationCode.objects.update_or_create(
            email=email,
            defaults={'generated_code': code, 'entered_code': None}
        )

        # URLs des logos
        URL_LOGO_PIXEL = "https://bu.parisnanterre.fr/medias/photo/vignette-pixel_1622616619465-png"
        URL_LOGO_NANTERRE = (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/"
            "Logo_Universit%C3%A9_Paris-Nanterre.svg/473px-Logo_Universit%C3%A9_Paris-Nanterre.svg.png"
        )

        # Préparation de l'affichage des 4 chiffres (petits blocs)
        code_digits_html = ''.join(
            f"""
            <div style="
                border: 2px solid #333; 
                display: inline-block; 
                width: 50px; 
                height: 50px; 
                line-height: 50px; 
                margin: 0 5px; 
                font-size: 24px; 
                font-weight: bold; 
                text-align: center;
            ">
                {digit}
            </div>
            """
            for digit in code
        )

        # Contenu HTML du mail
        html_content = f"""
        <html>
        <head>
            <meta charset="utf-8"/>
        </head>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; text-align:center;">

            <!-- En-tête : logos et titre -->
            <div style="display: flex; justify-content: center; align-items: center; margin: 20px 0;">
                <!-- Logo Pixel à gauche -->
                <div style="margin-right: 30px;">
                    <img src="{URL_LOGO_PIXEL}" alt="Logo Pixel" style="max-height: 80px;">
                </div>

                <!-- Titre au centre -->
                <h1 style="margin: 0; font-size: 28px;">
                    Box Silencieux
                </h1>

                <!-- Logo Paris Nanterre à droite -->
                <div style="margin-left: 30px;">
                    <img src="{URL_LOGO_NANTERRE}" alt="Logo Université Paris Nanterre" style="max-height: 80px;">
                </div>
            </div>

            <!-- Phrase explicative -->
            <p style="font-size: 16px; margin-top: 20px;">
                Voici votre code de validation. Vous avez 3 minutes pour l'entrer,
                passé ce délai, il expirera.
            </p>

            <!-- Affichage du code en 4 blocs -->
            <div style="margin-top: 30px;">
                {code_digits_html}
            </div>

            <!-- Signature en bas -->
            <div style="margin-top: 40px; text-align: center;">
                <img src="{URL_LOGO_NANTERRE}" alt="Logo Université Paris Nanterre" 
                     style="max-height: 50px; display: block; margin: 0 auto 10px auto;">
                <p style="font-size: 14px; line-height: 1.5; margin: 0;">
                    Université Paris Nanterre<br/>
                    200 avenue de la République<br/>
                    92001 Nanterre Cedex<br/>
                    01 40 97 72 02 (BU)<br/>
                    <a href="http://www.bu.parisnanterre.fr" target="_blank">
                        www.bu.parisnanterre.fr
                    </a>
                </p>
            </div>

        </body>
        </html>
        """

        # Envoi de l'email (fallback en texte brut pour les clients qui ne lisent pas le HTML)
        try:
            send_mail(
                subject='Votre code de vérification - Box Silencieux',
                message=f"Votre code de vérification est : {code}\n\nCe code expire dans 3 minutes.",
                from_email='boxsilencieusenoreply@gmail.com',
                recipient_list=[email],
                fail_silently=False,
                html_message=html_content,  # Le contenu HTML
            )
            messages.success(request, f"Un code de vérification a été envoyé à {email}.")
        except Exception as e:
            messages.error(request, f"Erreur lors de l'envoi de l'email : {e}")
            return redirect('index')

        # Stocker l'email en session
        request.session['email'] = email
        return redirect('verification')

    # Si GET ou autre, on affiche la page index
    return render(request, 'booking/index.html')



def verification(request):
    """
    Page de vérification du code :
    - L'étudiant saisit le code reçu par mail.
    - Si correct, on crée/associe un compte User et un StudentProfile, 
      puis on connecte l'utilisateur.
    """
    if request.method == "POST":
        email = request.session.get('email', '')
        code = request.POST.get('code', '')

        if not email or not code:
            messages.error(request, "Tous les champs sont requis.")
            return redirect('verification')

        try:
            v_obj = VerificationCode.objects.get(email=email)
            if v_obj.generated_code == code:
                # Créer ou récupérer le StudentProfile
                student, _ = StudentProfile.objects.get_or_create(email=email)

                # Créer ou récupérer le User
                user, _ = User.objects.get_or_create(
                    email=email,
                    defaults={'username': email.split('@')[0]}
                )

                # Générer un mot de passe aléatoire
                random_password = get_random_string(length=12)
                user.set_password(random_password)
                user.save()

                # Lier StudentProfile et User
                if student.user is None:
                    student.user = user
                    student.save()

                # Connecter l'utilisateur
                login(request, user)
                request.session['student_id'] = student.id

                messages.success(request, "Connexion réussie !")
                return redirect('reservation')
            else:
                messages.error(request, "Code incorrect.")
        except VerificationCode.DoesNotExist:
            messages.error(request, "Aucun code trouvé pour cet email.")

    return render(request, 'booking/Verification.html')


@csrf_exempt
def verify_code(request):
    """
    Version AJAX de la vérification du code.
    Renvoie un JSON { success: bool, message: str, redirect: str }
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('email')
            entered_code = data.get('code')

            if not email or not entered_code:
                return JsonResponse({'success': False, 'message': "Email et code sont requis."}, status=400)

            v_obj = VerificationCode.objects.filter(email=email).first()
            if not v_obj:
                return JsonResponse({'success': False, 'message': "Aucun code trouvé pour cet email."}, status=404)

            if v_obj.generated_code == entered_code:
                v_obj.entered_code = entered_code
                v_obj.save()

                student, _ = StudentProfile.objects.get_or_create(email=email)
                user, _ = User.objects.get_or_create(email=email, defaults={
                    'username': email.split('@')[0]
                })

                # Générer un mot de passe aléatoire
                random_password = get_random_string(length=12)
                user.set_password(random_password)
                user.save()

                if student.user is None:
                    student.user = user
                    student.save()

                login(request, user)
                request.session['student_id'] = student.id

                return JsonResponse({
                    'success': True, 
                    'message': "Code vérifié avec succès.", 
                    'redirect': '/reservation/'
                })
            else:
                return JsonResponse({'success': False, 'message': "Code incorrect."}, status=400)

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': "Méthode non autorisée."}, status=405)


@login_required
def reservation(request):
    """
    Page de réservation, accessible uniquement après connexion.
    On affiche les réservations déjà faites.
    """
    student_id = request.session.get('student_id')
    if not student_id:
        return redirect('index')

    try:
        student = StudentProfile.objects.get(id=student_id)
    except StudentProfile.DoesNotExist:
        return redirect('index')

    # Récupérer les réservations associées à l'utilisateur
    reservations = Reservation.objects.filter(user=student.user).select_related('time_slot').order_by('-time_slot__date')

    return render(request, 'booking/Reservation.html', {
        'student': student,
        'student_number': student.student_number or '',
        'reservations': reservations,
    })


# booking/views.py

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.db import transaction
from datetime import date
import json

from .models import Reservation, TimeSlot, StudentProfile

@login_required
def historique(request):
    """
    Affiche la page HTML de l'historique des réservations.
    Le tableau est rempli dynamiquement en JS (fetch vers /api/reservation-history/).
    """
    student_id = request.session.get('student_id')
    if not student_id:
        return redirect('index')

    try:
        student = StudentProfile.objects.get(id=student_id)
    except StudentProfile.DoesNotExist:
        return redirect('index')

    context = {
        "student_number": student.student_number,
        "user_email": student.email,
    }
    return render(request, 'booking/Historique.html', context)

@login_required
def reservation_history_api(request):
    if request.method == "GET":
        student_id = request.session.get('student_id')
        if not student_id:
            return JsonResponse({"success": False, "message": "Non connecté."}, status=403)

        try:
            student = StudentProfile.objects.get(id=student_id)
        except StudentProfile.DoesNotExist:
            return JsonResponse({"success": False, "message": "Profil étudiant introuvable."}, status=404)

        if not student.user:
            return JsonResponse({"success": False, "message": "Utilisateur non lié au profil."}, status=400)

        all_resa = Reservation.objects.filter(user=student.user)\
                                      .select_related('time_slot')\
                                      .order_by('-time_slot__date', '-time_slot__start_time')

        today_date = date.today()
        results = []
        for resa in all_resa:
            ts = resa.time_slot
            if not ts:
                continue

            status = "Passée" if ts.date < today_date else "En cours"

            results.append({
                "reservation_id": resa.id,
                # Renvoi ISO : "2025-01-17"
                "date": ts.date.isoformat(),
                "time_range": f"{ts.start_time.strftime('%H:%M')} - {ts.end_time.strftime('%H:%M')}",
                "room": ts.box.name,
                "status": status
            })

        return JsonResponse({"success": True, "reservations": results}, status=200)

    else:
        return JsonResponse({"success": False, "message": "Méthode non autorisée."}, status=405)

@login_required
@csrf_exempt
def cancel_reservation_api(request):
    """
    POST => { reservation_id: 123 }
    - Remet le TimeSlot en is_available = True
    - Supprime la Reservation correspondante
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            resa_id = data.get("reservation_id")
            if not resa_id:
                return JsonResponse({"success": False, "message": "Paramètre 'reservation_id' manquant."}, status=400)

            student_id = request.session.get('student_id')
            if not student_id:
                return JsonResponse({"success": False, "message": "Non connecté."}, status=403)

            student = StudentProfile.objects.get(id=student_id)
            if not student.user:
                return JsonResponse({"success": False, "message": "Utilisateur non lié au profil."}, status=400)

            with transaction.atomic():
                # Récupérer la Reservation pour ce user
                resa = Reservation.objects.select_for_update().filter(id=resa_id, user=student.user).first()
                if not resa:
                    return JsonResponse({"success": False, "message": "Réservation introuvable ou non autorisée."}, status=404)

                # Vérifier si c'est déjà passé
                if resa.time_slot.date < date.today():
                    return JsonResponse({"success": False, "message": "Impossible d'annuler une réservation passée."}, status=400)

                # Remet le TimeSlot en dispo
                resa.time_slot.is_available = True
                resa.time_slot.save()

                # Supprime la Reservation
                resa.delete()

            return JsonResponse({"success": True, "message": "Réservation annulée avec succès."})

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "JSON invalide."}, status=400)
        except StudentProfile.DoesNotExist:
            return JsonResponse({"success": False, "message": "Profil étudiant introuvable."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Méthode non autorisée."}, status=405)
    
@login_required
def get_user_email(request):
    
    student_id = request.session.get('student_id')
    if not student_id:
        return JsonResponse({"success": False, "message": "Non connecté."}, status=403)

    try:
        student = StudentProfile.objects.get(id=student_id)
        return JsonResponse({"email": student.email})
    except StudentProfile.DoesNotExist:
        return JsonResponse({"success": False, "message": "Profil introuvable."}, status=404)


@login_required
def get_student_number(request):
    """
    Retourne le student_number en JSON (ex: { "student_number": "123456" }).
    """
    try:
        sn = request.user.studentprofile.student_number
    except (AttributeError, StudentProfile.DoesNotExist):
        sn = None
    return JsonResponse({'student_number': sn})





@require_GET
@login_required
def get_available_boxes(request):
    """
    Ex: /api/available-boxes/?date=2025-01-17&start_time=08:30&end_time=09:45&type=Pixel
    Renvoie un tableau de boxes, chaque box ayant un champ "id", "name" et "slots".
    """
    filter_type = request.GET.get('type')
    date_str = request.GET.get('date')
    start_time_str = request.GET.get('start_time')
    end_time_str = request.GET.get('end_time')

    if not all([filter_type, date_str, start_time_str, end_time_str]):
        return JsonResponse({'boxes': []}, status=200)

    date_obj = parse_date(date_str)
    st_time = parse_time(start_time_str)
    ed_time = parse_time(end_time_str)
    if not all([date_obj, st_time, ed_time]):
        return JsonResponse({'boxes': []}, status=200)

    # Filtrer par type
    if filter_type.lower() == "pixel":
        box_qs = Box.objects.filter(name__startswith="PIXEL")
    elif filter_type.lower() == "droit":
        box_qs = Box.objects.filter(name__startswith="DROIT")
    else:
        return JsonResponse({'boxes': []}, status=200)

    # Récupération des TimeSlot
    ts_qs = TimeSlot.objects.filter(
        box__in=box_qs,
        date=date_obj,
        start_time__gte=st_time,
        end_time__lte=ed_time,
        is_available=True
    ).select_related('box').order_by('box__name', 'start_time')

    # Regrouper par nom de box
    grouped = {}
    for ts in ts_qs:
        bname = ts.box.name
        if bname not in grouped:
            grouped[bname] = []
        grouped[bname].append({
            'id': ts.id,  # ID du TimeSlot
            'availability_time': ts.start_time.strftime("%H:%M"),
            'is_available': ts.is_available,
        })

    # Construire la liste finale
    results = []
    for b in box_qs.order_by('name'):
        bname = b.name
        results.append({
            'id': b.id,  # ID de la Box
            'name': bname,
            'slots': grouped.get(bname, [])
        })

    return JsonResponse({'boxes': results}, status=200)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.utils.dateparse import parse_date, parse_time
from django.utils import timezone
import json
from datetime import date, timedelta, datetime

from .models import StudentProfile, TimeSlot, Reservation

def get_monday(d: date) -> date:
    """Retourne le lundi de la semaine de la date d."""
    return d - timedelta(days=d.weekday())  # Lundi = weekday=0
@csrf_exempt
@login_required
def make_reservation(request):
    """
    Règles demandées :
    - 2 réservations max par semaine (lundi->dimanche) par utilisateur.
    - Si l'utilisateur a déjà 2 réservations dans sa semaine courante,
      il ne peut réserver dans une nouvelle semaine (semaine suivante ou plus)
      que s'il a attendu 24h depuis sa dernière réservation.
    - Impossible de faire 3 résas dans la même semaine.
    """
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Méthode non autorisée."}, status=405)

    try:
        data = json.loads(request.body)
        box_id    = data.get("box_id")
        date_str  = data.get("date")
        start_str = data.get("start_time")
        end_str   = data.get("end_time")
        email     = data.get("email")

        # 1) Vérification des champs requis
        missing = []
        if not box_id:    missing.append("box_id")
        if not date_str:  missing.append("date")
        if not start_str: missing.append("start_time")
        if not end_str:   missing.append("end_time")
        if not email:     missing.append("email")
        if missing:
            return JsonResponse({
                "success": False,
                "message": f"Paramètres manquants : {', '.join(missing)}."
            }, status=400)

        # 2) Récupérer le StudentProfile + User
        try:
            student = StudentProfile.objects.get(email=email)
        except StudentProfile.DoesNotExist:
            return JsonResponse({"success": False, "message": "Profil étudiant introuvable."}, status=400)

        user = student.user
        if not user:
            return JsonResponse({"success": False, "message": "Utilisateur non lié au profil étudiant."}, status=400)

        # 3) Parser la date/heure
        parsed_date  = parse_date(date_str)
        parsed_start = parse_time(start_str)
        parsed_end   = parse_time(end_str)
        if not parsed_date or not parsed_start or not parsed_end:
            return JsonResponse({"success": False, "message": "Date ou heure invalide."}, status=400)

        # 4) Calcul de la semaine de la date ciblée
        monday_of_parsed = get_monday(parsed_date)
        sunday_of_parsed = monday_of_parsed + timedelta(days=6)

        with transaction.atomic():
            # a) Vérifier le nombre de résas déjà faites pour CETTE semaine
            resa_same_week_count = Reservation.objects.filter(
                user=user,
                time_slot__date__range=(monday_of_parsed, sunday_of_parsed)
            ).count()

            if resa_same_week_count >= 2:
                # => l'utilisateur a déjà 2 résas dans cette semaine => on bloque pour la 3e
                return JsonResponse({
                    "success": False,
                    "message": "Vous avez déjà 2 réservations dans cette semaine."
                }, status=400)

            # b) Vérifier si c'est une NOUVELLE semaine par rapport à la dernière réservation
            last_resa = Reservation.objects.filter(user=user).order_by('-created_at').first()
            if last_resa:
                last_resa_date = last_resa.time_slot.date
                monday_of_last = get_monday(last_resa_date)
                if monday_of_parsed != monday_of_last:
                    # => nouvelle semaine
                    old_week_sunday = monday_of_last + timedelta(days=6)
                    old_week_count = Reservation.objects.filter(
                        user=user,
                        time_slot__date__range=(monday_of_last, old_week_sunday)
                    ).count()
                    if old_week_count >= 2:
                        elapsed = timezone.now() - last_resa.created_at
                        if elapsed < timedelta(hours=24):
                            return JsonResponse({
                                "success": False,
                                "message": (
                                    "Vous avez déjà 2 réservations pour la semaine précédente. "
                                    "Vous devez attendre 24h avant de réserver pour une nouvelle semaine."
                                )
                            }, status=400)

            # c) Vérifier si le TimeSlot est encore disponible
            try:
                time_slot = TimeSlot.objects.select_for_update().get(
                    box_id=box_id,
                    date=parsed_date,
                    start_time=parsed_start,
                    end_time=parsed_end,
                    is_available=True
                )
            except TimeSlot.DoesNotExist:
                return JsonResponse({
                    "success": False,
                    "message": "Le créneau est déjà réservé ou inexistant."
                }, status=400)

            # d) Marquer indisponible + créer la réservation
            time_slot.is_available = False
            time_slot.save()

            new_resa = Reservation.objects.create(
                user=user,
                time_slot=time_slot,
                email=email
            )

        # ----------------------------
        # Envoi de l'email de confirmation
        # ----------------------------
        # Récupération des données à afficher
        date_formatee = time_slot.date.strftime("%d/%m/%Y")
        creneau = f"{time_slot.start_time.strftime('%H:%M')} - {time_slot.end_time.strftime('%H:%M')}"
        salle   = time_slot.box.name

        # URLs des logos
        URL_LOGO_PIXEL = "https://bu.parisnanterre.fr/medias/photo/vignette-pixel_1622616619465-png"
        URL_LOGO_NANTERRE = (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/"
            "Logo_Universit%C3%A9_Paris-Nanterre.svg/473px-Logo_Universit%C3%A9_Paris-Nanterre.svg.png"
        )

        # Construire le contenu HTML
        html_content = f"""
        <html>
        <head>
            <meta charset="utf-8"/>
        </head>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; text-align:center;">
            
            <!-- En-tête : logos et titre -->
            <div style="display: flex; justify-content: center; align-items: center; margin: 20px 0;">
                <!-- Logo Pixel à gauche -->
                <div style="margin-right: 30px;">
                    <img src="{URL_LOGO_PIXEL}" alt="Logo Pixel" style="max-height: 80px;">
                </div>

                <!-- Titre au centre -->
                <h1 style="margin: 0; font-size: 28px;">
                    Box Silencieux
                </h1>

                <!-- Logo Paris Nanterre à droite -->
                <div style="margin-left: 30px;">
                    <img src="{URL_LOGO_NANTERRE}" alt="Logo Université Paris Nanterre" style="max-height: 80px;">
                </div>
            </div>

            <!-- Titre de confirmation -->
            <h2 style="font-size: 22px; margin-top: 20px; color: #333;">
                Votre réservation est confirmée !
            </h2>

            <!-- Informations principales (date, créneau, salle) en gras et centrées -->
            <p style="font-size: 18px; color: #555; font-weight: bold; text-align:center; margin-top: 30px;">
                {date_formatee} — {creneau} — {salle}
            </p>

            <p style="font-size: 16px; margin: 20px auto; max-width: 600px;">
                Nous vous confirmons que votre réservation d’un box silencieux 
                a bien été prise en compte. Pensez à vous présenter 
                dans les temps et à respecter les consignes de la salle. 
            </p>

            <!-- Signature en bas -->
            <div style="margin-top: 40px; text-align: center;">
                <img src="{URL_LOGO_NANTERRE}" alt="Logo Université Paris Nanterre" 
                     style="max-height: 50px; display: block; margin: 0 auto 10px auto;">
                <p style="font-size: 14px; line-height: 1.5; margin: 0;">
                    Université Paris Nanterre<br/>
                    200 avenue de la République<br/>
                    92001 Nanterre Cedex<br/>
                    01 40 97 72 02 (BU)<br/>
                    <a href="http://www.bu.parisnanterre.fr" target="_blank">
                        www.bu.parisnanterre.fr
                    </a>
                </p>
            </div>

        </body>
        </html>
        """

        # Fallback texte brut
        text_message = (
            f"Votre réservation est confirmée !\n\n"
            f"Date : {date_formatee}\n"
            f"Créneau : {creneau}\n"
            f"Salle : {salle}\n\n"
            "Université Paris Nanterre\n"
            "200 avenue de la République\n"
            "92001 Nanterre Cedex\n"
            "01 40 97 72 02 (BU)\n"
            "www.bu.parisnanterre.fr"
        )

        try:
            send_mail(
                subject="Confirmation de réservation - Box Silencieux",
                message=text_message,
                from_email="boxsilencieusenoreply@gmail.com",
                recipient_list=[email],
                fail_silently=False,
                html_message=html_content,
            )
        except Exception as e:
            # On n’empêche pas la réservation, on signale juste l’erreur
            return JsonResponse({"success": True, "message": f"Réservation confirmée, mais échec d'envoi du mail : {e}"})

        # Fin : on renvoie la réponse JSON standard
        return JsonResponse({"success": True, "message": "Réservation confirmée !"})

    except json.JSONDecodeError:
        return JsonResponse({"success": False, "message": "Données JSON invalides."}, status=400)
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)
