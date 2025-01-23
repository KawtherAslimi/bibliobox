document.addEventListener("DOMContentLoaded", () => {
    // Bouton pour ouvrir la fenêtre de vérification
    const openVerificationButton = document.getElementById("open-verification");

    openVerificationButton.addEventListener("click", (event) => {
        event.preventDefault(); // Empêche le comportement par défaut

        const emailInput = document.getElementById("email").value.trim();
        const emailRegex = /^[0-9]{8}@parisnanterre\.fr$/; // Vérification stricte du format de l'email

        if (emailRegex.test(emailInput)) {
            console.log("Adresse email valide : " + emailInput);

            // Envoi de la requête au backend
            fetch("/", { // URL '/' correspond à votre fonction `index` dans views.py
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, // Token CSRF
                },
                body: new URLSearchParams({ email: emailInput }).toString(),
            })
            .then(response => {
                if (!response.ok) throw new Error("Erreur réseau");
                return response.text();
            })
            .then((responseHTML) => {
                // Vérifier si l'email a été accepté
                if (responseHTML.includes("Un code de vérification a été envoyé")) {
                    alert("Le code de vérification a été envoyé.");

                    // Stocker l'email dans localStorage pour la page de vérification
                    localStorage.setItem("email", emailInput);

                    // Ouvrir la page Vérification dans une petite fenêtre
                    const verificationUrl = "/verification/";
                    const windowFeatures = "width=400,height=600,scrollbars=no,resizable=no";
                    const verificationWindow = window.open(verificationUrl, "VerificationWindow", windowFeatures);

                    if (!verificationWindow) {
                        alert("Votre navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.");
                    }
                } else {
                    alert("Une erreur s'est produite. Veuillez vérifier votre email.");
                }
            })
            .catch((error) => {
                console.error("Erreur lors de l'envoi de la requête :", error);
                alert("Une erreur s'est produite. Veuillez réessayer.");
            });
        } else {
            alert("Veuillez entrer une adresse e-mail universitaire valide au format 12345678@parisnanterre.fr.");
        }
    });
});
// Navigation fluide vers la section #connexion
document.querySelectorAll('a[href="#connexion"]').forEach((link) => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelector("#connexion").scrollIntoView({
            behavior: "smooth",
        });
    });
});