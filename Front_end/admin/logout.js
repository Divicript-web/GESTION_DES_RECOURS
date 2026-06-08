// Front_end/admin/logout.js
document.addEventListener('DOMContentLoaded', () => {
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');

    if (logoutTrigger && logoutModal) {
        logoutTrigger.addEventListener('click', () => {
            logoutModal.style.display = 'flex';
        });
        btnCancelLogout.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
        window.addEventListener('click', (e) => {
            if (e.target === logoutModal) logoutModal.style.display = 'none';
        });
    }
});