const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

document.addEventListener('DOMContentLoaded', () => {
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout);
    setupSystemToggle();
    loadAdminDashboard();
});

function setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout) {
    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', (event) => {
            event.preventDefault();
            logoutModal.style.display = 'flex';
        });
    }

    if (btnCancelLogout) {
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
        if (event.target === logoutModal) logoutModal.style.display = 'none';
    });
}

function setupSystemToggle() {
    const toggleBtn = document.getElementById('toggleSystemBtn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const isOpen = toggleBtn.classList.contains('active');
        toggleBtn.classList.toggle('active', !isOpen);
        toggleBtn.textContent = isOpen ? "Fermé" : "Ouvert";
        toggleBtn.style.backgroundColor = isOpen ? "#dc2626" : "#059669";
    });
}

async function loadAdminDashboard() {
    try {
        const [profileResponse, recoursResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_ORIGIN}/api/admin/recours`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

        if (profileResponse.status === 401 || recoursResponse.status === 401) {
            window.location.href = '../login.html';
            return;
        }

        const profile = await profileResponse.json();
        const recoursData = await recoursResponse.json();

        if (!profileResponse.ok) throw new Error(profile.message || 'Profil introuvable');
        if (!recoursResponse.ok) throw new Error(recoursData.message || 'Accès refusé');

        const roleLabel = profile.role === 'superadmin' ? 'Superadmin' : 'Admin';
        document.getElementById('adminName').textContent = roleLabel;
        renderRecours(recoursData.recours || []);
    } catch (error) {
        console.error(error);
        document.getElementById('recoursBody').innerHTML = `
            <tr><td colspan="7" style="text-align:center;">Impossible de charger les recours.</td></tr>
        `;
    }
}

function renderRecours(recoursList) {
    const pending = recoursList.filter((recours) => recours.status === 'pending').length;
    const processed = recoursList.length - pending;

    document.getElementById('totalRecours').textContent = recoursList.length;
    document.getElementById('pendingRecours').textContent = pending;
    document.getElementById('processedRecours').textContent = processed;

    const tbody = document.getElementById('recoursBody');
    tbody.innerHTML = '';

    if (recoursList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Aucun recours enregistré.</td></tr>`;
        return;
    }

    recoursList.forEach((recours) => {
        const row = document.createElement('tr');
        const fullName = [recours.prenom, recours.nom, recours.post_nom].filter(Boolean).join(' ');
        const evaluations = Array.isArray(recours.evaluation_types) ? recours.evaluation_types.join('/') : '-';
        const status = getStatus(recours.status);

        row.innerHTML = `
            <td>${escapeHtml(recours.matricule)}</td>
            <td>${escapeHtml(fullName || '-')}</td>
            <td>${escapeHtml(recours.course_code)}</td>
            <td>${escapeHtml(evaluations)}</td>
            <td>${formatDate(recours.created_at)}</td>
            <td><span class="status ${status.className}">${status.label}</span></td>
            <td><button type="button" class="btn-action" title="Détails">Voir</button></td>
        `;

        row.querySelector('.btn-action').addEventListener('click', () => {
            alert([
                `Étudiant : ${fullName || '-'}`,
                `Matricule : ${recours.matricule}`,
                `Cours : ${recours.course_code} - ${recours.course_title}`,
                `Évaluation : ${evaluations}`,
                `Statut : ${status.label}`,
                `Justification : ${recours.justification || '-'}`,
                `Preuve : ${recours.proof_name || 'Aucune'}`,
            ].join('\n'));
        });

        tbody.appendChild(row);
    });
}

function getStatus(status) {
    const statuses = {
        pending: { label: 'À traiter', className: 'pending' },
        validated: { label: 'Validé', className: 'success' },
        success: { label: 'Validé', className: 'success' },
        rejected: { label: 'Rejeté', className: 'danger' },
    };

    return statuses[status] || statuses.pending;
}

function formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('fr-FR').format(new Date(value.replace(' ', 'T')));
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
