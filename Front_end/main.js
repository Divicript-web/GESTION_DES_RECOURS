document.addEventListener("DOMContentLoaded", () => {
    const API_ORIGIN = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:3000";
    const loginForm = document.getElementById("loginForm");
    const loginAlert = document.getElementById("loginAlert");
    const passwordInput = document.getElementById("password");
    const togglePasswordIcon = document.getElementById("togglePassword");
    const usernameInput = document.getElementById("username"); // Vérifie que ton input matricule a bien l'id "username"

    // 1. Gestion de l'affichage du mot de passe
    if (togglePasswordIcon) {
        togglePasswordIcon.addEventListener("click", () => {
            const isPassword = passwordInput.getAttribute("type") === "password";
            passwordInput.setAttribute("type", isPassword ? "text" : "password");
            togglePasswordIcon.classList.toggle("fa-eye");
            togglePasswordIcon.classList.toggle("fa-eye-slash");
        });
    }

    // 2. Logique de connexion API
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const matricule = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch(`${API_ORIGIN}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricule, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Sauvegarde du token pour les requêtes futures
                localStorage.setItem('token', data.token);
                
                // Redirection basée sur le rôle retourné par le serveur
                if (data.role === 'admin') {
                    window.location.href = "admin/dashboard.html";
                } else if (data.role === 'enseignant') {
                    window.location.href = "professeur/dashboard.html";
                } else {
                    window.location.href = "etudiant/dashboard.html";
                }
            } else {
                // Affichage de l'alerte en cas d'échec
                if (loginAlert) {
                    loginAlert.style.display = "block";
                    loginAlert.innerText = data.message || "Erreur de connexion";
                    setTimeout(() => { loginAlert.style.display = "none"; }, 3000);
                }
            }
        } catch (error) {
            console.error("Erreur:", error);
            alert("Serveur inaccessible. Vérifie qu'il est bien lancé.");
        }
    });

    // 3. Gestion de la modale "Mot de passe oublié"
    const forgotLink = document.getElementById("forgotPasswordLink");
    const forgotModal = document.getElementById("forgotModal");
    const closeModalBtn = document.getElementById("closeModal");

    if (forgotLink && forgotModal) {
        forgotLink.addEventListener("click", (e) => { 
            e.preventDefault(); 
            forgotModal.classList.add("active"); 
        });
        closeModalBtn.addEventListener("click", () => { 
            forgotModal.classList.remove("active"); 
        });
    }
});
