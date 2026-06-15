document.addEventListener("DOMContentLoaded", () => {
    const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
    const registerForm = document.getElementById("registerForm");
    const registerAlert = document.getElementById("registerAlert");
    const registerSuccess = document.getElementById("registerSuccess");

    function showMessage(element, message) {
        element.innerHTML = message;
        element.style.display = "flex";
    }

    function hideMessages() {
        registerAlert.style.display = "none";
        registerSuccess.style.display = "none";
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideMessages();

        const payload = {
            matricule: document.getElementById("matricule").value.trim(),
            nom: document.getElementById("nom").value.trim(),
            postnom: document.getElementById("postnom").value.trim(),
            prenom: document.getElementById("prenom").value.trim(),
            departement: document.getElementById("departement").value.trim(),
            promotion: document.getElementById("promotion").value.trim(),
            password: document.getElementById("password").value,
            confirmPassword: document.getElementById("confirmPassword").value,
        };

        try {
            const response = await fetch(`${API_ORIGIN}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await response.json()
                : { message: "Route d'inscription introuvable. Redémarrez le serveur backend." };

            if (!response.ok) {
                showMessage(registerAlert, `<i class="fa-solid fa-triangle-exclamation"></i> ${data.message || "Inscription impossible"}`);
                return;
            }

            showMessage(registerSuccess, `<i class="fa-solid fa-circle-check"></i> ${data.message || "Compte créé avec succès"}`);
            registerForm.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);
        } catch (error) {
            console.error(error);
            showMessage(registerAlert, '<i class="fa-solid fa-triangle-exclamation"></i> Serveur inaccessible.');
        }
    });
});
