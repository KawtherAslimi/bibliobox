document.addEventListener("DOMContentLoaded", () => {
    const openVerificationButton = document.getElementById("open-verification");

    openVerificationButton.addEventListener("click", (event) => {
        event.preventDefault();

        const emailInput = document.getElementById("email").value.trim();
        const emailRegex = /^[0-9]{8}@parisnanterre\.fr$/; // On vérifie le format de l'email saisi, on ne veut que les emails universitaire 

        if (emailRegex.test(emailInput)) {
            console.log("Adresse email valide : " + emailInput);

            // On envoie l'email au serveur pour vérifier
            fetch("/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, 
                },
                body: new URLSearchParams({ email: emailInput }).toString(),
            })
            .then(response => {
                if (!response.ok) throw new Error("Problème avec la requête");
                return response.text();
            })
            .then((responseHTML) => {
                // Si l'email est bon, on affiche un message et on ouvre la page de vérification
                if (responseHTML.includes("Un code de vérification a été envoyé")) {
                    alert("Le code de vérification a été envoyé.");
                    localStorage.setItem("email", emailInput); // Stocke l'email pour la suite

                    // Ouvre une nouvelle fenêtre pour entrer le code reçu (point à revoir car en réalité c'est un onglet qui s'ouvre pas une fenetre)
                    const verificationUrl = "/verification/";
                    const windowFeatures = "width=400,height=600,scrollbars=no,resizable=no";
                    const verificationWindow = window.open(verificationUrl, "VerificationWindow", windowFeatures);

                    // Si le pop-up est bloqué par le navigateur
                    if (!verificationWindow) {
                        alert("Le navigateur a bloqué la fenêtre. Pensez à autoriser les pop-ups.");
                    }
                } else {
                    alert("Problème avec l'email. Vérifiez et réessayez.");
                }
            })
            .catch((error) => {
                console.error("Erreur lors de la requête :", error);
                alert("Oups, une erreur est survenue. Essayez encore.");
            });
        } else {
            alert("L'email doit être au format 12345678@parisnanterre.fr.");
        }
    });
});

// Défilement fluide vers la section #connexion quand on clique sur un lien (Réservation et Historique)
document.querySelectorAll('a[href="#connexion"]').forEach((link) => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelector("#connexion").scrollIntoView({
            behavior: "smooth",
        });
    });
});
