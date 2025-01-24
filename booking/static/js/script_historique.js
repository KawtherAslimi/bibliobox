document.addEventListener("DOMContentLoaded", () => {
    const historyBody = document.getElementById("history-body");
    const noDataRow = document.getElementById("no-data");
    const studentNumberElement = document.getElementById("student-number");
    const userEmailElement = document.getElementById("user-email");
    const totalReservationsElem = document.getElementById("total-reservations");
    const exportButton = document.getElementById("export-excel");

    // Récupération du numéro étudiant et affichage dans l'interface
    fetch("/api/get-student-number/")
        .then((resp) => {
            if (!resp.ok) {
                throw new Error("Impossible de récupérer le numéro étudiant.");
            }
            return resp.json();
        })
        .then((data) => {
            studentNumberElement.textContent = data.student_number || "Inconnu";
        })
        .catch((error) => {
            console.error("Impossible de récupérer le numéro étudiant :", error);
            studentNumberElement.textContent = "Inconnu";
        });

    // Récupération de l'email et affichage dans le profil utilisateur
    fetch("/api/get-user-email/")
        .then((resp) => {
            if (!resp.ok) {
                throw new Error("Impossible de récupérer l'email (non connecté ?).");
            }
            return resp.json();
        })
        .then((data) => {
            userEmailElement.textContent = data.email || "Inconnu";
        })
        .catch((error) => {
            console.error("Impossible de récupérer l'email :", error);
            userEmailElement.textContent = "Inconnu";
        });

    // Ajout d'une réservation dans le tableau
    const addReservationToHistory = (reservation) => {
        // Formate la date pour l'affichage
        const formatDate = (isoDate) => {
            const dateObj = new Date(isoDate); 
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return `${day}/${month}/${year}`;
        };

        // Supprime la ligne indiquant l'absence de réservations si elle existe
        if (noDataRow) {
            noDataRow.remove();
        }

        // Création d'une nouvelle ligne pour afficher la réservation
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${formatDate(reservation.date)}</td>
            <td>${reservation.time_range}</td>
            <td>${reservation.room}</td>
            <td>${reservation.status}</td>
            <td>
                ${
                    reservation.status === "En cours"
                        ? `<button class="btn-cancel" data-id="${reservation.reservation_id}">Annuler</button>`
                        : "-"
                }
            </td>
        `;

        historyBody.appendChild(row);

        // Ajout d'un événement sur le bouton d'annulation
        if (reservation.status === "En cours") {
            const cancelBtn = row.querySelector(".btn-cancel");
            cancelBtn.addEventListener("click", () => {
                if (confirm("Voulez-vous vraiment annuler cette réservation ?")) {
                    cancelReservation(reservation.reservation_id, row);
                }
            });
        }
    };

    // Annulation d'une réservation
    const cancelReservation = async (reservationId, rowElement) => {
        try {
            const response = await fetch("/api/cancel-reservation/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken"), // Lecture du token CSRF pour la requête
                },
                body: JSON.stringify({ reservation_id: reservationId }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Erreur lors de l'annulation.");
            }

            // Suppression de la ligne du tableau et mise à jour du compteur
            rowElement.remove();
            checkIfEmpty();
            updateTotalCount();
            alert("Réservation annulée avec succès !");
        } catch (error) {
            alert("Erreur : " + error.message);
        }
    };

    // Vérification si le tableau est vide et affichage d'un message
    const checkIfEmpty = () => {
        if (historyBody.children.length === 0) {
            historyBody.innerHTML = `
                <tr id="no-data">
                    <td colspan="5" style="text-align: center;"> </td>
                </tr>
            `;
        }
    };

    // Mise à jour du nombre total de réservations
    const updateTotalCount = () => {
        const rows = Array.from(historyBody.querySelectorAll("tr"));
        const actualRows = rows.filter((r) => r.id !== "no-data");
        totalReservationsElem.textContent = actualRows.length;
    };

    // Chargement de l'historique des réservations depuis l'API
    const loadHistory = async () => {
        try {
            const response = await fetch("/api/reservation-history/");
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Impossible de charger l'historique.");
            }

            const data = await response.json();
            if (data.success) {
                const reservations = data.reservations || [];
                reservations.forEach((resa) => addReservationToHistory(resa));
                updateTotalCount();
            } else {
                console.error("Erreur API :", data.message);
            }
        } catch (error) {
            console.error("Erreur lors du chargement de l'historique :", error);
        }
    };

    // Récupération du token CSRF pour les requêtes sécurisées
    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.startsWith(name + "=")) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    // Exportation de l'historique en fichier CSV
    if (exportButton) {
        exportButton.addEventListener("click", () => {
            const table = document.getElementById("history-table");
            const rows = Array.from(table.rows);
            const csvData = [];

            // Extraction des entêtes
            const headers = Array.from(rows[0].cells).map((cell) => cell.textContent.trim());
            csvData.push(headers.join(","));

            // Extraction des lignes du tableau
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = Array.from(row.cells).map((cell) => cell.textContent.trim());
                csvData.push(cells.join(","));
            }

            // Création du fichier et déclenchement du téléchargement
            const csvString = csvData.join("\n");
            const blob = new Blob([csvString], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "Historique_Reservations.csv";
            link.click();
        });
    }

    // Lancement de la récupération de l'historique et vérification des données au chargement
    loadHistory();
    checkIfEmpty();
});

// Gestion du menu utilisateur (affichage du menu au clic)
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
