import os
import django
from datetime import datetime, date, time, timedelta


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "reservation_system.settings")
django.setup()

from booking.models import Box, TimeSlot

def run():
   
    START_DATE = date(2025, 1, 17)  # Date de début : correspond a la date de la création du script 
    END_DATE   = date(2025, 12, 31) # Date de fin : fin de l'année
    START_TIME = time(8, 30)        # 08:30 : horaire d'ouverture de la bibliothèque
    END_TIME   = time(19, 45)       # 19:45 : fermeture de la bibliothèque (19h45 -> 20h : un créneau)
    SLOT_DELTA = timedelta(minutes=15)

    # Jours fériés  
    HOLIDAYS_2025 = {
        date(2025, 1, 1),   # Jour de l'an
        date(2025, 4, 21),  # Lundi de Pâques
        date(2025, 5, 1),   # Fête du Travail
        date(2025, 5, 8),   # Armistice 1945
        date(2025, 5, 29),  # Ascension
        date(2025, 6, 9),   # Lundi de Pentecôte
        date(2025, 7, 14),  # Fête Nationale
        date(2025, 8, 15),  # Assomption
        date(2025, 11, 1),  # Toussaint
        date(2025, 11, 11), # Armistice 1918
        date(2025, 12, 25), # Noël
    }

   
    
    print("Suppression des créneaux existants entre", START_DATE, "et", END_DATE, "...")
    TimeSlot.objects.filter(date__range=(START_DATE, END_DATE)).delete()

    
    # Génération des créneaux
    print("Génération des créneaux horaires de", START_DATE, "à", END_DATE, "...")
    all_boxes = Box.objects.all()
    if not all_boxes.exists():
        print("Aucune Box trouvée dans la base. Vérifiez vos données.")
        return

    current_date = START_DATE

    # On génère pour chaque jour, puis on incrémente la date de +1
    while current_date <= END_DATE:
        # On exclu les week-ends et jours fériés
        if current_date.weekday() < 5 and current_date not in HOLIDAYS_2025:
            # Pour chaque box
            for box in all_boxes:
                slots_to_create = []
                # Convertir current_date + heures de début/fin en datetime
                day_start = datetime.combine(current_date, START_TIME)
                day_end   = datetime.combine(current_date, END_TIME)

                # Boucle dans la journée par quart d'heure
                slot_start = day_start
                while slot_start < day_end:
                    slot_end = slot_start + SLOT_DELTA
                    # Préparer l'objet TimeSlot
                    slots_to_create.append(
                        TimeSlot(
                            box=box,
                            date=current_date,
                            start_time=slot_start.time(),
                            end_time=slot_end.time(),
                            is_available=True,
                        )
                    )
                    slot_start = slot_end

                TimeSlot.objects.bulk_create(slots_to_create)

        current_date += timedelta(days=1)

    print("Créneaux horaires générés avec succès jusqu'au", END_DATE, ".")

if __name__ == "__main__":
    run()
