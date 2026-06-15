const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const btnCloseDetails = document.getElementById('btnCloseDetails');

    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout);
    setupDetailsModal(detailsModal, closeDetailsModal, btnCloseDetails);
    loadDashboard(token);
});

function setupLogout(logoutTrigger, logoutModal, btnCancelLogout) {
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

    window.addEventListener('click', (event) => {
        if (event.target === logoutModal) {
            logoutModal.style.display = 'none';
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && logoutModal && logoutModal.style.display === 'flex') {
            logoutModal.style.display = 'none';
        }
    });
}

function setupDetailsModal(detailsModal, closeDetailsModal, btnCloseDetails) {
    const close = () => {
        detailsModal.style.display = 'none';
    };

    if (closeDetailsModal) closeDetailsModal.addEventListener('click', close);
    if (btnCloseDetails) btnCloseDetails.addEventListener('click', close);

    window.addEventListener('click', (event) => {
        if (event.target === detailsModal) {
            close();
        }
    });
}

async function loadDashboard(token) {
    try {
        const [profileResponse, recoursResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_ORIGIN}/api/recours/me`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

        if (profileResponse.status === 401 || recoursResponse.status === 401) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '../login.html';
            return;
        }

        const profile = await profileResponse.json();
        const recoursData = await recoursResponse.json();

        if (!profileResponse.ok) throw new Error(profile.message || 'Profil introuvable');
        if (!recoursResponse.ok) throw new Error(recoursData.message || 'Recours introuvables');

        renderUser(profile);
        renderRecours(recoursData.recours || []);
    } catch (error) {
        console.error(error);
        renderError('Impossible de charger vos recours pour le moment.');
    }
}

function renderUser(user) {
    const fullName = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ');
    document.getElementById('userName').textContent = fullName || 'Étudiant';
    document.getElementById('userMatricule').textContent = `Matricule : ${user.matricule || '-'}`;
}

function renderRecours(recoursList) {
    const total = recoursList.length;
    const pending = recoursList.filter((item) => item.status === 'pending').length;
    const validated = recoursList.filter((item) => item.status === 'validated' || item.status === 'success').length;

    document.getElementById('totalRecours').textContent = total;
    document.getElementById('pendingRecours').textContent = pending;
    document.getElementById('validatedRecours').textContent = validated;

    const tbody = document.getElementById('recoursTableBody');
    tbody.innerHTML = '';

    if (recoursList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">Aucun recours déposé pour le moment.</td>
            </tr>
        `;
        return;
    }

    recoursList.forEach((recours) => {
        const row = document.createElement('tr');
        const status = getStatusInfo(recours.status);
        const evaluations = Array.isArray(recours.evaluation_types) ? recours.evaluation_types.join(', ') : '';
        const openDetails = () => openDetailsModal(recours, status, evaluations);

        row.className = 'recours-row';
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Voir les détails du recours ${recours.course_code}`);
        row.innerHTML = `
            <td><b>${escapeHtml(recours.course_code)}</b></td>
            <td>${escapeHtml(recours.course_title)}</td>
            <td>${formatDate(recours.created_at)}</td>
            <td><span class="status-badge ${status.className}">${status.label}</span></td>
            <td><button class="btn-view" type="button" title="Détails"><i class="fa-solid fa-eye"></i></button></td>
        `;

        row.addEventListener('click', openDetails);
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDetails();
            }
        });

        row.querySelector('.btn-view').addEventListener('click', (event) => {
            event.stopPropagation();
            openDetails();
        });

        tbody.appendChild(row);
    });
}

function openDetailsModal(recours, status, evaluations) {
    const modal = document.getElementById('detailsModal');
    const body = document.getElementById('detailsModalBody');

    body.innerHTML = `
        <div class="details-row">
            <strong>Cours</strong>
            <span>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</span>
        </div>
        <div class="details-row">
            <strong>Type d'évaluation</strong>
            <span>${escapeHtml(evaluations || '-')}</span>
        </div>
        <div class="details-row">
            <strong>Date de dépôt</strong>
            <span>${formatDate(recours.created_at)}</span>
        </div>
        <div class="details-row">
            <strong>Statut</strong>
            <span class="status-badge ${status.className}">${status.label}</span>
        </div>
        <div class="details-row">
            <strong>Justification</strong>
            <p>${escapeHtml(recours.justification || '-')}</p>
        </div>
        <div class="details-row">
            <strong>Preuve jointe</strong>
            <span>${renderProof(recours)}</span>
        </div>
    `;

    modal.style.display = 'flex';
}

function renderProof(recours) {
    if (!recours.proof_name) return 'Aucune';
    if (!recours.proof_path) return escapeHtml(recours.proof_name);

    return `<a href="${escapeHtml(API_ORIGIN + recours.proof_path)}" target="_blank" rel="noopener">${escapeHtml(recours.proof_name)}</a>`;
}

function renderError(message) {
    document.getElementById('recoursTableBody').innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center;">${escapeHtml(message)}</td>
        </tr>
    `;
}

function getStatusInfo(status) {
    const statuses = {
        pending: { label: 'En attente', className: 'pending' },
        validated: { label: 'Validé', className: 'success' },
        success: { label: 'Validé', className: 'success' },
        rejected: { label: 'Rejeté', className: 'danger' },
    };

    return statuses[status] || statuses.pending;
}

function formatDate(value) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value.replace(' ', 'T')));
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
