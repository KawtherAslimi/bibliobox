
document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------
    // Sélecteurs
    // --------------------------------------------------
    const dateInput       = document.getElementById("date-selection");
    const startTimeSelect = document.getElementById("start-time");
    const endTimeSelect   = document.getElementById("end-time");
    const searchButton    = document.getElementById("search-btn");
    const boxesContainer  = document.getElementById("boxes-container");
    const boxSelection    = document.getElementById("box-selection");

    // SECTION et FORMULAIRE de confirmation
    const confirmationSection = document.getElementById("confirmation-form"); 
    const reservationForm     = document.getElementById("reservation-form");

    // On masque la SECTION complète par défaut
    confirmationSection.style.display = "none";

    // Champs de récapitulatif
    const confirmDateElem  = document.getElementById("confirm-date");
    const confirmSlotElem  = document.getElementById("confirm-slot");
    const confirmRoomElem  = document.getElementById("confirm-room");
    const confirmEmailElem = document.getElementById("confirm-email");

    // --------------------------------------------------
    // 1) Récupérer l'email depuis localStorage OU depuis /api/get-user-email/
    // --------------------------------------------------
    const storedEmail = localStorage.getItem("student_email");
    if (storedEmail) {
        confirmEmailElem.value = storedEmail;
    } else {
        fetch("/api/get-user-email/")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Impossible de récupérer l'email.");
                }
                return response.json();
            })
            .then((data) => {
                localStorage.setItem("student_email", data.email);
                confirmEmailElem.value = data.email;
            })
            .catch((error) => {
                console.error("Erreur lors de la récupération de l'email :", error);
                confirmEmailElem.value = "unknown@parisnanterre.fr";
            });
    }

    // --------------------------------------------------
    // Mise en place d’une date minimale (aujourd'hui)
    // --------------------------------------------------
    const setMinDate = () => {
        const today = new Date();
        const yyyy  = today.getFullYear();
        const mm    = String(today.getMonth() + 1).padStart(2, "0");
        const dd    = String(today.getDate()).padStart(2, "0");
        dateInput.setAttribute("min", `${yyyy}-${mm}-${dd}`);
    };

    // --------------------------------------------------
    // Générer des options horaires (08:30 -> 19:45)
    // --------------------------------------------------
    const generateTimeOptions = (select) => {
        select.innerHTML = "";
        let currentHour   = 8;
        let currentMinute = 30;
        const endHour     = 19;
        const endMinute   = 45;

        while (true) {
            const val = `${String(currentHour).padStart(2,"0")}:${String(currentMinute).padStart(2,"0")}`;
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);

            currentMinute += 15;
            if (currentMinute >= 60) {
                currentMinute = 0;
                currentHour++;
            }
            if (currentHour > endHour || (currentHour === endHour && currentMinute > endMinute)) {
                break;
            }
        }
    };

    // --------------------------------------------------
    // CSRF token (pour Django)
    // --------------------------------------------------
    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.substring(0, name.length + 1) === (name + "=")) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };
    const csrftoken = getCookie("csrftoken");

    // --------------------------------------------------
    // Formater la date (jj/mm/aaaa) pour l'affichage final
    // --------------------------------------------------
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        const day   = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year  = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // --------------------------------------------------
    // Générer la liste des slots (start -> end, par pas de 15 min)
    // --------------------------------------------------
    const generateSlots = (startTime, endTime) => {
        const slots = [];
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM]     = endTime.split(":").map(Number);

        let currentH = startH;
        let currentM = startM;

        while (currentH < endH || (currentH === endH && currentM < endM)) {
            slots.push(`${String(currentH).padStart(2,"0")}:${String(currentM).padStart(2,"0")}`);
            currentM += 15;
            if (currentM >= 60) {
                currentM = 0;
                currentH++;
            }
        }
        return slots;
    };

    // --------------------------------------------------
    // Calcule l'heure de fin (slot + 15 min)
    // --------------------------------------------------
    const computeEndTime = (slot) => {
        const [h, m] = slot.split(":").map(Number);
        let endH = h;
        let endM = m + 15;
        if (endM >= 60) {
            endM -= 60;
            endH += 1;
        }
        return `${String(endH).padStart(2,"0")}:${String(endM).padStart(2,"0")}`;
    };

    // --------------------------------------------------
    // API pour obtenir la liste de boxes
    // --------------------------------------------------
    const fetchBoxes = async (date, startTime, endTime, boxType) => {
        try {
            const url = `/api/available-boxes/?date=${date}&start_time=${startTime}&end_time=${endTime}&type=${boxType}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("Erreur lors de la récupération des boxes.");
            }
            const data = await response.json();
            return data.boxes || [];
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    // --------------------------------------------------
    // Générer et afficher les boxes
    // --------------------------------------------------
    const generateBoxes = async (date, startTime, endTime, boxType) => {
        boxesContainer.innerHTML = "";

        const boxes = await fetchBoxes(date, startTime, endTime, boxType);
        if (!boxes.length) {
            boxesContainer.innerHTML = "<p>Aucune box disponible pour ces critères.</p>";
            return;
        }

        // Pour chaque box, on va "lister" les slots entre startTime et endTime
        // puis marquer ceux qui sont disponibles.
        const slotList = generateSlots(startTime, endTime);

        boxes.forEach((box) => {
            // box = { id: <box_id>, name: "PIXEL A", slots: [ {id: <TimeSlot_id>, availability_time:"08:30", ...}, ... ] }

            // Div d'une box
            const boxDiv = document.createElement("div");
            boxDiv.className = "box";

            // Icône
            const boxImage = document.createElement("img");
            boxImage.src = "/static/images/appel.png";
            boxImage.alt = "Icône salle";
            boxImage.classList.add("icon-box1");
            boxDiv.appendChild(boxImage);

            // Titre salle
            const h3 = document.createElement("h3");
            h3.textContent = box.name;
            boxDiv.appendChild(h3);

            // Slots container
            const slotsContainer = document.createElement("div");
            slotsContainer.className = "slots";

            slotList.forEach((slot) => {
                const slotDiv = document.createElement("div");
                slotDiv.classList.add("slot", "available");
                slotDiv.textContent = slot;

                // Vérifier si le slot se trouve dans box.slots
                const found = box.slots.find(
                    (s) => s.availability_time === slot && s.is_available
                );
                if (!found) {
                    // Slot non disponible => grisé
                    slotDiv.classList.remove("available");
                    slotDiv.classList.add("unavailable");
                }

                slotDiv.addEventListener("click", () => {
                    // Sélectionne ce slot, désélectionne les autres
                    slotsContainer.querySelectorAll(".slot").forEach((s) => s.classList.remove("selected"));
                    if (slotDiv.classList.contains("available")) {
                        slotDiv.classList.add("selected");
                    }
                });

                slotsContainer.appendChild(slotDiv);
            });
            boxDiv.appendChild(slotsContainer);

            // Bouton "Réserver"
            const reserveBtn = document.createElement("button");
            reserveBtn.className = "reserve-btn";
            reserveBtn.textContent = "Réserver";

            reserveBtn.addEventListener("click", () => {
                const selectedSlot = boxDiv.querySelector(".slot.selected");
                if (!selectedSlot) {
                    alert("Veuillez sélectionner un créneau avant de réserver.");
                    return;
                }

                // Mise à jour du récap
                confirmDateElem.textContent = formatDate(date);
                confirmSlotElem.textContent = selectedSlot.textContent;
                confirmRoomElem.textContent = box.name;

                // Affichage de la section de confirmation
                confirmationSection.style.display = "block";
                confirmationSection.scrollIntoView({ behavior: "smooth" });

                // Soumission du formulaire
                reservationForm.onsubmit = async (e) => {
                    e.preventDefault();
                    try {
                        const payload = {
                            box_id: box.id,
                            date: date,
                            start_time: selectedSlot.textContent,
                            end_time: computeEndTime(selectedSlot.textContent),
                            email: confirmEmailElem.value,
                        };
                        console.log("Payload envoyé :", payload);

                        const response = await fetch("/api/make-reservation/", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRFToken": csrftoken,
                            },
                            body: JSON.stringify(payload),
                        });

                        const result = await response.json();
                        if (!response.ok) {
                            throw new Error(result.message || "Erreur lors de la réservation.");
                        }

                        alert("Réservation réussie !");
                        // Redirection
                        window.location.href = "/historique/";
                    } catch (error) {
                        alert("Erreur : " + error.message);
                    }
                };
            });
            boxDiv.appendChild(reserveBtn);

            boxesContainer.appendChild(boxDiv);
        });
    };

    // --------------------------------------------------
    // Bouton "Rechercher"
    // --------------------------------------------------
    searchButton.addEventListener("click", async () => {
        const selectedDate    = dateInput.value;
        const startTime       = startTimeSelect.value;
        const endTime         = endTimeSelect.value;
        const selectedBoxType = boxSelection.value;

        if (!selectedDate || !startTime || !endTime) {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        await generateBoxes(selectedDate, startTime, endTime, selectedBoxType);
    });

    // --------------------------------------------------
    // Initialisation
    // --------------------------------------------------
    const init = () => {
        setMinDate();
        generateTimeOptions(startTimeSelect);
        generateTimeOptions(endTimeSelect);
    };

    init();
});

