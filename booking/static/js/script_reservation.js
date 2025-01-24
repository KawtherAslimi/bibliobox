document.addEventListener("DOMContentLoaded", () => {
    // On récupère tous les éléments nécessaires du DOM
    const dateInput       = document.getElementById("date-selection");
    const startTimeSelect = document.getElementById("start-time");
    const endTimeSelect   = document.getElementById("end-time");
    const searchButton    = document.getElementById("search-btn");
    const boxesContainer  = document.getElementById("boxes-container");
    const boxSelection    = document.getElementById("box-selection");

    // Section et formulaire de confirmation
    const confirmationSection = document.getElementById("confirmation-form"); 
    const reservationForm     = document.getElementById("reservation-form");

    // On cache la section de confirmation au départ
    confirmationSection.style.display = "none";

    // Éléments pour afficher le récapitulatif de la réservation
    const confirmDateElem  = document.getElementById("confirm-date");
    const confirmSlotElem  = document.getElementById("confirm-slot");
    const confirmRoomElem  = document.getElementById("confirm-room");
    const confirmEmailElem = document.getElementById("confirm-email");

    // On vérifie si l'email est déjà dans le localStorage
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

    // On définit la date minimale autorisée (aujourd'hui)
    const setMinDate = () => {
        const today = new Date();
        const yyyy  = today.getFullYear();
        const mm    = String(today.getMonth() + 1).padStart(2, "0");
        const dd    = String(today.getDate()).padStart(2, "0");
        dateInput.setAttribute("min", `${yyyy}-${mm}-${dd}`);
    };

    // On génère la liste des créneaux horaires entre 08:30 et 19:45
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

    // Cette fonction récupère le token CSRF pour les requêtes POST
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

    // Cette fonction formate une date en jj/mm/aaaa
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        const day   = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year  = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // On génère tous les créneaux de 15 minutes entre deux heures
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

    // On calcule l'heure de fin en ajoutant 15 minutes à un créneau donné
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

    // Cette fonction appelle l'API pour récupérer les boxes disponibles
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

    // On génère et on affiche les boxes disponibles
    const generateBoxes = async (date, startTime, endTime, boxType) => {
        boxesContainer.innerHTML = "";

        const boxes = await fetchBoxes(date, startTime, endTime, boxType);
        if (!boxes.length) {
            boxesContainer.innerHTML = "<p>Aucune box disponible pour ces critères.</p>";
            return;
        }

        // Pour chaque box, on liste les créneaux (slots) et on indique ceux qui sont libres
        const slotList = generateSlots(startTime, endTime);

        boxes.forEach((box) => {
            const boxDiv = document.createElement("div");
            boxDiv.className = "box";

            const boxImage = document.createElement("img");
            boxImage.src = "/static/images/appel.png";
            boxImage.alt = "Icône salle";
            boxImage.classList.add("icon-box1");
            boxDiv.appendChild(boxImage);

            const h3 = document.createElement("h3");
            h3.textContent = box.name;
            boxDiv.appendChild(h3);

            const slotsContainer = document.createElement("div");
            slotsContainer.className = "slots";

            slotList.forEach((slot) => {
                const slotDiv = document.createElement("div");
                slotDiv.classList.add("slot", "available");
                slotDiv.textContent = slot;

                const found = box.slots.find(
                    (s) => s.availability_time === slot && s.is_available
                );
                if (!found) {
                    slotDiv.classList.remove("available");
                    slotDiv.classList.add("unavailable");
                }

                slotDiv.addEventListener("click", () => {
                    slotsContainer.querySelectorAll(".slot").forEach((s) => s.classList.remove("selected"));
                    if (slotDiv.classList.contains("available")) {
                        slotDiv.classList.add("selected");
                    }
                });

                slotsContainer.appendChild(slotDiv);
            });
            boxDiv.appendChild(slotsContainer);

            const reserveBtn = document.createElement("button");
            reserveBtn.className = "reserve-btn";
            reserveBtn.textContent = "Réserver";

            reserveBtn.addEventListener("click", () => {
                const selectedSlot = boxDiv.querySelector(".slot.selected");
                if (!selectedSlot) {
                    alert("Veuillez sélectionner un créneau avant de réserver.");
                    return;
                }

                confirmDateElem.textContent = formatDate(date);
                confirmSlotElem.textContent = selectedSlot.textContent;
                confirmRoomElem.textContent = box.name;

                confirmationSection.style.display = "block";
                confirmationSection.scrollIntoView({ behavior: "smooth" });

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

    // Quand on clique sur "Rechercher", on récupère la date, l'heure et le type de box pour générer les résultats
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

    // On initialise la page en définissant la date min et en créant les options horaires
    const init = () => {
        setMinDate();
        generateTimeOptions(startTimeSelect);
        generateTimeOptions(endTimeSelect);
    };

    init();
});

// Gestion du menu utilisateur au clic
document.addEventListener("click", function (e) {
    const userMenu = document.querySelector(".user-menu");
    const dropdown = document.querySelector(".dropdown");
    
    if (userMenu.contains(e.target)) {
        e.stopPropagation();
        dropdown.style.display = (dropdown.style.display === "block") 
            ? "none" 
            : "block";
    } else {
        dropdown.style.display = "none";
    }
});
