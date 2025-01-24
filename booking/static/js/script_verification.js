document.addEventListener("DOMContentLoaded", () => {
    // On récupère les champs où l'utilisateur va entrer le code
    const codeInputs = document.querySelectorAll(".code-input");
    const hiddenCodeInput = document.getElementById("hidden-code");
    const verificationForm = document.getElementById("verification-form");

    // Quand on tape dans un champ, on passe automatiquement au suivant
    codeInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            if (input.value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }

            // On assemble les chiffres saisis pour former le code complet
            hiddenCodeInput.value = Array.from(codeInputs).map(input => input.value).join("");
        });

        // Gestion de la touche "Retour arrière" pour revenir au champ précédent
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && input.value === "" && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
    });

    // Quand on soumet le formulaire
    verificationForm.addEventListener("submit", (event) => {
        event.preventDefault(); // On empêche le rechargement de la page

        const enteredCode = hiddenCodeInput.value.trim();
        if (enteredCode.length !== 4) {
            alert("Veuillez entrer un code complet à 4 chiffres.");
            return;
        }

        // On récupère l'email stocké localement
        const email = localStorage.getItem("email");
        if (!email) {
            alert("Adresse e-mail introuvable. Veuillez réessayer.");
            return;
        }

        // On envoie le code au serveur pour vérifier s'il est correct
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
                // Redirection vers la page de réservation si le code est correct
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

    // Durée du timer en secondes (3 minutes)
    let timeLeft = 3 * 60; // 180 secondes

    // Mise à jour du timer chaque seconde
    const countdown = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        // Mise à jour de l'affichage du temps restant
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(countdown); // Arrête le timer
            alert("Temps écoulé. Veuillez demander un nouveau code.");

            // Désactive le bouton de validation pour empêcher d'envoyer un code expiré
            verificationButton.disabled = true;

            // Optionnel : on pourrait rediriger vers la page d'accueil
            // window.location.href = "/index/"; 
        }

        timeLeft--;
    }, 1000); // Décompte chaque seconde
});
