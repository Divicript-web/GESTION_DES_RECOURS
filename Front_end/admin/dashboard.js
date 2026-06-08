document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Gestion de la modale de déconnexion ---
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

    window.addEventListener('click', (e) => {
        if (e.target === logoutModal) logoutModal.style.display = 'none';
    });

    // --- 2. Gestion de l'état système (Toggle Ouvert/Fermé) ---
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
});