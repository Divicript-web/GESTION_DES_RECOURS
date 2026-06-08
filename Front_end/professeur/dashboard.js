document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================
    // 1. GESTION DE LA DÉCONNEXION (Identique pour tous)
    // ==========================================================
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');

    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });
    }

    if (btnCancelLogout) {
        btnCancelLogout.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
    }

    // Fermeture en cliquant en dehors de la modale
    window.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = 'none';
        }
    });

    // ==========================================================
    // 2. GESTION DU TOGGLE SYSTÈME (Admin uniquement)
    // ==========================================================
    const toggleBtn = document.getElementById('toggleSystemBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isOpen = toggleBtn.classList.contains('active');
            if (isOpen) {
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = "Fermé";
                toggleBtn.style.backgroundColor = "#dc2626";
            } else {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = "Ouvert";
                toggleBtn.style.backgroundColor = "#059669";
            }
        });
    }

    // ==========================================================
    // 3. GESTION DES MODALES DE DÉCISION (Professeur)
    // ==========================================================
    // Si tu as besoin d'ouvrir une modale pour traiter un recours :
    const decisionModal = document.getElementById('decisionModal');
    const btnCancelDecision = document.getElementById('btnCancelDecision');

    // Fonction pour ouvrir la modale de traitement
    window.openDecisionModal = () => {
        if (decisionModal) decisionModal.style.display = 'flex';
    };

    if (btnCancelDecision) {
        btnCancelDecision.addEventListener('click', () => {
            decisionModal.style.display = 'none';
        });
    }
});
// Dans dashboard.js
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('passwordInput');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        // Basculer le type entre password et text
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Basculer l'icône entre œil ouvert et œil barré
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });
}