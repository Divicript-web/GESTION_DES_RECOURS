/**
 * dashboard.js
 * Gère les interactions dynamiques du tableau de bord étudiant
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GESTION DE LA MODALE DE DÉCONNEXION ---
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');

    // Affiche la modale au clic sur le bouton déconnexion
    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', (e) => {
            e.preventDefault(); // Empêche le lien par défaut
            logoutModal.style.display = 'flex';
        });
    }

    // Ferme la modale via le bouton annuler
    if (btnCancelLogout) {
        btnCancelLogout.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
    }

    // Ferme la modale en cliquant sur l'arrière-plan flouté
    window.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = 'none';
        }
    });

    // --- 2. GESTION DES DÉTAILS DANS LE TABLEAU ---
    const viewButtons = document.querySelectorAll('.btn-view');
    
    // Ajoute un écouteur sur chaque bouton "Voir"
    viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.target.closest('tr'); // Récupère la ligne cliquée
            const courseName = row.querySelector('td:nth-child(2)').innerText;
            console.log(`Ouverture des détails : ${courseName}`);
        });
    });
});
// Fermeture de la modale avec la touche Echap
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && logoutModal.style.display === 'flex') {
        logoutModal.style.display = 'none';
    }
});
/**
 * Bascule la visibilité du mot de passe
 * @param {string} id - L'ID de l'input mot de passe
 * @param {HTMLElement} icon - L'icône cliquée
 */
function togglePass(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}
/**
 * Fonction pour basculer la visibilité du mot de passe
 */
function togglePass(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}
// Vérification automatique à chaque chargement de page
if (!localStorage.getItem('token')) {
    // Si pas de token, on renvoie à la page de connexion
    window.location.href = '../login.html'; 
}