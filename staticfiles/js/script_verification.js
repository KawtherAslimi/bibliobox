document.addEventListener("DOMContentLoaded", () => {
    // Sélection des éléments dans la page
    const codeInputs = document.querySelectorAll(".code-input");
    const hiddenCodeInput = document.getElementById("hidden-code");
    const verificationForm = document.getElementById("verification-form");

    codeInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            if (input.value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }

            // Assemble le code complet dans le champ caché
            hiddenCodeInput.value = Array.from(codeInputs).map(input => input.value).join("");
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && input.value === "" && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
    });

    verificationForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Empêche le rechargement de la page
        
        const enteredCode = hiddenCodeInput.value.trim();
        if (enteredCode.length !== 4) {
            alert("Veuillez entrer un code complet à 4 chiffres.");
            return;
        }

        // Récupération de l'email depuis localStorage
        const email = localStorage.getItem("email");
        if (!email) {
            alert("Adresse e-mail introuvable. Veuillez réessayer.");
            return;
        }

        // Envoi du code au serveur pour vérification
        fetch('/verify-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            },
            body: JSON.stringify({ email: email, code: enteredCode }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                // Redirection vers la page de réservation
                window.location.href = "/reservation/";
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error("Erreur lors de la vérification du code :", error);
            alert("Une erreur est survenue. Veuillez réessayer.");
        });
    });

    const timerElement = document.getElementById("time");
    const verificationButton = verificationForm.querySelector("button[type='submit']");

    // Définissez la durée du timer en secondes (3 minutes)
    let timeLeft = 3 * 60; // 180 secondes

    // Fonction pour mettre à jour le timer toutes les secondes
    const countdown = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        // Mettre à jour l'affichage du timer
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(countdown); // Arrêter le timer
            alert("Temps écoulé. Veuillez réenvoyer un nouveau code de vérification.");
            
            // Désactiver le formulaire de vérification
            verificationButton.disabled = true;

            // Optionnel : Rediriger l'utilisateur vers la page d'accueil ou une page spécifique
            // window.location.href = "/index/"; // Remplacez par l'URL appropriée
        }

        timeLeft--;
    }, 1000); // Exécute toutes les 1000 millisecondes (1 seconde)
});
