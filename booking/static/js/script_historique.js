document.addEventListener("DOMContentLoaded", () => {
    const historyBody = document.getElementById("history-body");
    const noDataRow = document.getElementById("no-data");
    const studentNumberElement = document.getElementById("student-number");
    const userEmailElement = document.getElementById("user-email");
    const totalReservationsElem = document.getElementById("total-reservations");
    const exportButton = document.getElementById("export-excel");


    

    // ----------------------------------------------------------------
    // 1) Récupérer le numéro étudiant et l'afficher dans l'onglet user
    // ----------------------------------------------------------------
    fetch("/api/get-student-number/")
        .then((resp) => {
            if (!resp.ok) {
                throw new Error("Impossible de récupérer le numéro étudiant.");
            }
            return resp.json();
        })
        .then((data) => {
            // data = { "student_number": "123456" } ou null
            studentNumberElement.textContent = data.student_number || "Inconnu";
        })
        .catch((error) => {
            console.error("Impossible de récupérer le numéro étudiant :", error);
            studentNumberElement.textContent = "Inconnu";
        });

    // ----------------------------------------------------------------
    // 2) Récupérer l'email et l'afficher dans la section "Profil et Statistiques"
    // ----------------------------------------------------------------
    fetch("/api/get-user-email/")
        .then((resp) => {
            if (!resp.ok) {
                throw new Error("Impossible de récupérer l'email (non connecté ?).");
            }
            return resp.json();
        })
        .then((data) => {
            // data = { "email": "XXXXXX@parisnanterre.fr" }
            userEmailElement.textContent = data.email || "Inconnu";
        })
        .catch((error) => {
            console.error("Impossible de récupérer l'email :", error);
            userEmailElement.textContent = "Inconnu";
        });

  // 3) Fonction pour insérer une réservation dans le tableau
const addReservationToHistory = (reservation) => {
    // Convertir la date ISO "2025-01-17" en "DD/MM/YYYY"
    const formatDate = (isoDate) => {
        // isoDate = "2025-01-17"
        const dateObj = new Date(isoDate); 
        // => new Date("2025-01-17") => OK
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Supprime la ligne "Aucune réservation" si existante
    if (noDataRow) {
        noDataRow.remove();
    }

    // Crée une nouvelle ligne dans le tableau
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

    // Active le bouton "Annuler" si nécessaire
    if (reservation.status === "En cours") {
        const cancelBtn = row.querySelector(".btn-cancel");
        cancelBtn.addEventListener("click", () => {
            if (confirm("Voulez-vous vraiment annuler cette réservation ?")) {
                cancelReservation(reservation.reservation_id, row);
            }
        });
    }
};


    // ----------------------------------------------------------------
    // 4) Annuler une réservation
    // ----------------------------------------------------------------
    const cancelReservation = async (reservationId, rowElement) => {
        try {
            const response = await fetch("/api/cancel-reservation/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken"), // Assurez-vous d'avoir le token CSRF dans vos cookies
                },
                body: JSON.stringify({ reservation_id: reservationId }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Erreur lors de l'annulation.");
            }

            // Suppression de la ligne dans le tableau
            rowElement.remove();
            checkIfEmpty();
            updateTotalCount();
            alert("Réservation annulée avec succès !");
        } catch (error) {
            alert("Erreur : " + error.message);
        }
    };

    // ----------------------------------------------------------------
    // 5) Vérifie si le tableau est vide pour réafficher le "no-data"
    // ----------------------------------------------------------------
    const checkIfEmpty = () => {
        if (historyBody.children.length === 0) {
            historyBody.innerHTML = `
                <tr id="no-data">
                    <td colspan="5" style="text-align: center;"> </td>
                </tr>
            `;
        }
    };

    // ----------------------------------------------------------------
    // 6) Mettre à jour le compteur total
    // ----------------------------------------------------------------
    const updateTotalCount = () => {
        const rows = Array.from(historyBody.querySelectorAll("tr"));
        const actualRows = rows.filter((r) => r.id !== "no-data");
        totalReservationsElem.textContent = actualRows.length;
    };

    // ----------------------------------------------------------------
    // 7) Charger l'historique depuis l'API
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // 8) Lecture du cookie CSRF (pour les requêtes POST)
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // 9) Exporter le tableau en CSV
    // ----------------------------------------------------------------
    if (exportButton) {
        exportButton.addEventListener("click", () => {
            const table = document.getElementById("history-table");
            const rows = Array.from(table.rows);
            const csvData = [];

            // Récupère l'entête
            const headers = Array.from(rows[0].cells).map((cell) => cell.textContent.trim());
            csvData.push(headers.join(","));

            // Récupère chaque ligne
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = Array.from(row.cells).map((cell) => cell.textContent.trim());
                csvData.push(cells.join(","));
            }

            // Convertit en blob et déclenche le téléchargement
            const csvString = csvData.join("\n");
            const blob = new Blob([csvString], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "Historique_Reservations.csv";
            link.click();
        });
    }

    // ----------------------------------------------------------------
    // 10) Initialisation : on charge l'historique et vérifie si vide
    // ----------------------------------------------------------------
    loadHistory();
    checkIfEmpty();
});
// ------------------------------------------
// Gestion du menu utilisateur par clic
// ------------------------------------------
document.addEventListener("click", function (e) {
    const userMenu = document.querySelector(".user-menu");
    const dropdown = document.querySelector(".dropdown");
    
    // Si on clique sur l'icône user (ou dans la zone .user-menu),
    // on toggle l'affichage du dropdown
    if (userMenu.contains(e.target)) {
        e.stopPropagation();
        dropdown.style.display = (dropdown.style.display === "block") 
            ? "none" 
            : "block";
    } 
    // Sinon, si on clique ailleurs dans la page, on ferme la dropdown
    else {
        dropdown.style.display = "none";
    }
});
