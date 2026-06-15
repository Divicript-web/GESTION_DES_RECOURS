const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    const passwordForm = document.getElementById('passwordForm');

    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout);
    setupPasswordToggles();
    loadProfile(token);

    passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await updatePassword(token, passwordForm);
    });
});

function setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout) {
    if (logoutTrigger && logoutModal) {
        logoutTrigger.addEventListener('click', (event) => {
            event.preventDefault();
            logoutModal.style.display = 'flex';
        });
    }

    if (btnCancelLogout && logoutModal) {
        btnCancelLogout.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
    }

    if (confirmLogout) {
        confirmLogout.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === logoutModal) {
            logoutModal.style.display = 'none';
        }
    });
}

function setupPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach((icon) => {
        icon.addEventListener('click', () => {
            const input = document.getElementById(icon.dataset.passwordToggle);
            const isPassword = input.type === 'password';

            input.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye', !isPassword);
            icon.classList.toggle('fa-eye-slash', isPassword);
        });
    });
}

async function loadProfile(token) {
    try {
        const response = await fetch(`${API_ORIGIN}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '../login.html';
            return;
        }

        const user = await response.json();
        if (!response.ok) throw new Error(user.message || 'Impossible de charger le profil');

        renderProfile(user);
    } catch (error) {
        console.error(error);
        showAlert('Impossible de charger votre profil.', 'error');
    }
}

function renderProfile(user) {
    const fullName = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ');
    const roleLabels = {
        etudiant: 'Étudiant',
        enseignant: 'Enseignant',
        admin: 'Administrateur',
    };

    document.querySelector('.user-name').textContent = fullName || 'Utilisateur';
    document.querySelector('.user-role').textContent = `Matricule : ${user.matricule || '-'}`;
    document.getElementById('profileFullName').textContent = fullName || '-';
    document.getElementById('profileMatricule').textContent = user.matricule || '-';
    document.getElementById('profileRole').textContent = roleLabels[user.role] || user.role || '-';
    document.getElementById('profileDepartement').textContent = user.departement || '-';
    document.getElementById('profilePromotion').textContent = user.promotion || '-';
}

async function updatePassword(token, form) {
    const submitButton = form.querySelector('.btn-save');
    const payload = {
        currentPassword: document.getElementById('pass1').value,
        newPassword: document.getElementById('pass2').value,
        confirmPassword: document.getElementById('pass3').value,
    };

    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Enregistrement...';

        const response = await fetch(`${API_ORIGIN}/profile/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(data.message || 'Modification impossible.', 'error');
            return;
        }

        form.reset();
        showAlert(data.message || 'Mot de passe modifié avec succès.', 'success');
    } catch (error) {
        console.error(error);
        showAlert('Serveur inaccessible.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Enregistrer les modifications';
    }
}

function showAlert(message, type) {
    const alert = document.getElementById('profileAlert');
    alert.textContent = message;
    alert.className = `profile-alert ${type}`;
    alert.style.display = 'block';
}
