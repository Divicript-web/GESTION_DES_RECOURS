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
        const [profileResponse, recoursResponse, settingsResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_ORIGIN}/api/recours/me`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_ORIGIN}/api/settings/public`),
        ]);

        if (profileResponse.status === 401 || recoursResponse.status === 401) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '../login.html';
            return;
        }

        const profile = await profileResponse.json();
        const recoursData = await recoursResponse.json();
        const settingsData = await settingsResponse.json();

        if (!profileResponse.ok) throw new Error(profile.message || 'Profil introuvable');
        if (!recoursResponse.ok) throw new Error(recoursData.message || 'Recours introuvables');

        renderSettings(settingsData);
        renderUser(profile);
        renderRecours(recoursData.recours || []);
    } catch (error) {
        console.error(error);
        renderError('Impossible de charger vos recours pour le moment.');
    }
}

function renderSettings(settings) {
    const bannerText = document.querySelector('.banner-text');
    const newRecoursButton = document.querySelector('.btn-new-recours');

    if (bannerText && settings.announcement_message) {
        const periodText = buildPeriodText(settings);
        bannerText.innerHTML = `<strong>Message du Décanat :</strong> ${escapeHtml(settings.announcement_message)}${periodText ? `<br>${escapeHtml(periodText)}` : ''}`;
    }

    if (newRecoursButton && settings.recours_open === false) {
        newRecoursButton.disabled = true;
        newRecoursButton.style.opacity = '0.65';
        newRecoursButton.style.cursor = 'not-allowed';
        newRecoursButton.querySelector('span').textContent = 'Dépôt fermé';
        newRecoursButton.title = settings.recours_status_message || 'La période de dépôt est fermée';
    }
}

function buildPeriodText(settings) {
    if (settings.recours_start_date && settings.recours_end_date) {
        return `Période de dépôt : du ${formatDate(settings.recours_start_date)} au ${formatDate(settings.recours_end_date)}.`;
    }

    if (settings.recours_start_date) {
        return `Période de dépôt : à partir du ${formatDate(settings.recours_start_date)}.`;
    }

    if (settings.recours_end_date) {
        return `Période de dépôt : jusqu'au ${formatDate(settings.recours_end_date)}.`;
    }

    return settings.recours_status_message || '';
}

function renderUser(user) {
    const fullName = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ');
    document.getElementById('userName').textContent = fullName || 'Étudiant';
    document.getElementById('userMatricule').textContent = `Matricule : ${user.matricule || '-'}`;
}

function renderRecours(recoursList) {
    const total = recoursList.length;
    const pending = recoursList.filter((item) => ['pending', 'assigned'].includes(item.status)).length;
    const validated = recoursList.filter((item) => ['published', 'validated', 'success'].includes(item.status)).length;

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
        ${renderPublishedResponse(recours)}
    `;

    modal.style.display = 'flex';
}

function renderPublishedResponse(recours) {
    if (recours.status !== 'published') {
        return `
            <div class="details-row">
                <strong>Réponse finale</strong>
                <span>La réponse sera visible après publication par l'administration.</span>
            </div>
        `;
    }

    return `
        <div class="details-row">
            <strong>Décision finale</strong>
            <span>${escapeHtml(recours.professor_decision || '-')}</span>
        </div>
        <div class="details-row">
            <strong>Réponse finale</strong>
            <p>${escapeHtml(recours.professor_response || '-')}</p>
        </div>
        <div class="details-row">
            <strong>Date de publication</strong>
            <span>${formatDate(recours.published_at)}</span>
        </div>
    `;
}

function renderProof(recours) {
    if (!window.FileAttachment) {
        if (!recours.proof_name) return 'Aucune';
        if (!recours.proof_path) return escapeHtml(recours.proof_name);
        return `<a href="${escapeHtml(API_ORIGIN + recours.proof_path)}" target="_blank" rel="noopener">${escapeHtml(recours.proof_name)}</a>`;
    }

    return window.FileAttachment.render({
        name: recours.proof_name,
        path: recours.proof_path,
        apiOrigin: API_ORIGIN,
        emptyText: 'Aucune preuve jointe',
    });
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
        pending: { label: 'Soumis', className: 'pending' },
        assigned: { label: 'En traitement', className: 'info' },
        treated: { label: 'Traité', className: 'info' },
        published: { label: 'Publié', className: 'success' },
        validated: { label: 'Validé', className: 'success' },
        success: { label: 'Validé', className: 'success' },
        rejected: { label: 'Rejeté', className: 'danger' },
    };

    return statuses[status] || statuses.pending;
}

function formatDate(value) {
    if (!value) return '-';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Intl.DateTimeFormat('fr-FR').format(new Date(year, month - 1, day));
    }

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
