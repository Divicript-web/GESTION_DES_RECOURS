const API_ORIGIN = window.AdminUI.API_ORIGIN;
const token = window.AdminUI.getToken();

let recoursCache = [];
let settingsCache = {};
let periodCache = {};

document.addEventListener('DOMContentLoaded', async () => {
    window.AdminUI.setupLogout(
        document.getElementById('logoutTrigger'),
        document.getElementById('logoutModal'),
        document.getElementById('btnCancelLogout'),
        document.getElementById('confirmLogout')
    );

    const admin = await window.AdminUI.requireAdminPage('adminName');
    if (!admin) return;

    setupControls();
    await loadAdminDashboard();
});

function setupControls() {
    const broadcastButton = document.getElementById('broadcastButton');
    const savePeriodButton = document.getElementById('savePeriodButton');

    if (broadcastButton) broadcastButton.addEventListener('click', saveAnnouncement);
    if (savePeriodButton) savePeriodButton.addEventListener('click', savePeriodDates);
}

async function loadAdminDashboard() {
    try {
        const [recoursResponse, settingsResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/api/admin/recours`, {
                headers: window.AdminUI.authHeaders(),
            }),
            fetch(`${API_ORIGIN}/api/admin/settings`, {
                headers: window.AdminUI.authHeaders(),
            }),
        ]);
        const recoursData = await recoursResponse.json();
        const settingsData = await settingsResponse.json();

        if (!recoursResponse.ok) throw new Error(recoursData.message || 'Accès refusé');
        if (!settingsResponse.ok) throw new Error(settingsData.message || 'Paramètres introuvables');

        recoursCache = recoursData.recours || [];
        settingsCache = settingsData.settings || {};
        periodCache = settingsData.recours_period || {};
        renderSettings();
        renderRecours(recoursCache);
    } catch (error) {
        console.error(error);
        document.getElementById('recoursBody').innerHTML = emptyRow(7, 'Impossible de charger les recours.');
        await window.AdminUI.showMessage({ title: 'Erreur', message: error.message, variant: 'danger' });
    }
}

function renderSettings() {
    const messageInput = document.getElementById('msgInput');
    const startDateInput = document.getElementById('recoursStartDate');
    const endDateInput = document.getElementById('recoursEndDate');
    const statusPanel = document.getElementById('systemStatusPanel');
    const statusIcon = document.getElementById('periodStatusIcon');
    const statusTitle = document.getElementById('periodStatusTitle');
    const periodStatusText = document.getElementById('periodStatusText');
    const statusBadge = document.getElementById('periodStatusBadge');
    const status = buildAutomaticPeriodStatus();

    if (messageInput) messageInput.value = settingsCache.announcement_message || '';
    if (startDateInput) startDateInput.value = settingsCache.recours_start_date || '';
    if (endDateInput) endDateInput.value = settingsCache.recours_end_date || '';
    if (statusPanel) statusPanel.className = `system-status-panel is-${status.state}`;
    if (statusIcon) statusIcon.innerHTML = `<i class="${status.icon}"></i>`;
    if (statusTitle) statusTitle.textContent = status.title;
    if (periodStatusText) periodStatusText.textContent = status.description;
    if (statusBadge) statusBadge.textContent = status.badge;
}

async function saveAnnouncement() {
    const message = document.getElementById('msgInput').value.trim();

    try {
        await saveSettings({ announcement_message: message });
        await window.AdminUI.showMessage({ title: 'Succès', message: 'Message étudiant diffusé avec succès.' });
    } catch (error) {
        await window.AdminUI.showMessage({ title: 'Erreur', message: error.message, variant: 'danger' });
    }
}

async function savePeriodDates() {
    const startDate = document.getElementById('recoursStartDate').value;
    const endDate = document.getElementById('recoursEndDate').value;

    if (startDate && endDate && startDate > endDate) {
        await window.AdminUI.showMessage({
            title: 'Dates invalides',
            message: 'La date de début doit être antérieure ou égale à la date de fin.',
            variant: 'danger',
        });
        return;
    }

    try {
        await saveSettings({
            recours_start_date: startDate,
            recours_end_date: endDate,
        });
        await window.AdminUI.showMessage({
            title: 'Succès',
            message: 'Période automatique de dépôt mise à jour avec succès.',
        });
    } catch (error) {
        await window.AdminUI.showMessage({ title: 'Erreur', message: error.message, variant: 'danger' });
    }
}

async function saveSettings(payload) {
    const response = await fetch(`${API_ORIGIN}/api/admin/settings`, {
        method: 'PUT',
        headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Mise à jour impossible');

    settingsCache = data.settings || settingsCache;
    periodCache = data.recours_period || periodCache;
    renderSettings();
}

function buildAutomaticPeriodStatus() {
    const startDate = settingsCache.recours_start_date;
    const endDate = settingsCache.recours_end_date;
    const today = getTodayDateString();

    if (startDate && today < startDate) {
        return {
            state: 'scheduled',
            title: 'Dépôt planifié',
            badge: 'Ouverture automatique',
            icon: 'fa-solid fa-clock',
            description: `Les dépôts seront ouverts automatiquement le ${formatDate(startDate)}.`,
        };
    }

    if (endDate && today > endDate) {
        return {
            state: 'closed',
            title: 'Dépôt fermé',
            badge: 'Fermeture automatique',
            icon: 'fa-solid fa-lock',
            description: `La période de dépôt est terminée depuis le ${formatDate(endDate)}.`,
        };
    }

    if (startDate && endDate) {
        return {
            state: 'open',
            title: 'Dépôt ouvert',
            badge: 'Actif automatiquement',
            icon: 'fa-solid fa-circle-check',
            description: `Les dépôts sont autorisés du ${formatDate(startDate)} au ${formatDate(endDate)}.`,
        };
    }

    if (startDate) {
        return {
            state: 'open',
            title: 'Dépôt ouvert',
            badge: 'Actif automatiquement',
            icon: 'fa-solid fa-circle-check',
            description: `Les dépôts sont autorisés depuis le ${formatDate(startDate)}.`,
        };
    }

    if (endDate) {
        return {
            state: 'open',
            title: 'Dépôt ouvert',
            badge: 'Actif automatiquement',
            icon: 'fa-solid fa-circle-check',
            description: `Les dépôts sont autorisés jusqu'au ${formatDate(endDate)}.`,
        };
    }

    return {
        state: periodCache.state || 'open',
        title: 'Dépôt ouvert',
        badge: 'Aucune limite configurée',
        icon: 'fa-solid fa-circle-check',
        description: periodCache.reason || 'Aucune date de début ou de fin n’est configurée.',
    };
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderRecours(recoursList) {
    const pending = recoursList.filter((recours) => recours.status === 'pending').length;
    const processed = recoursList.filter((recours) => ['treated', 'published', 'validated', 'rejected'].includes(recours.status)).length;

    document.getElementById('totalRecours').textContent = recoursList.length;
    document.getElementById('pendingRecours').textContent = pending;
    document.getElementById('processedRecours').textContent = processed;

    const tbody = document.getElementById('recoursBody');
    tbody.innerHTML = '';

    if (recoursList.length === 0) {
        tbody.innerHTML = emptyRow(7, 'Aucun recours enregistré.');
        return;
    }

    recoursList.slice(0, 10).forEach((recours) => {
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
            <td class="table-actions"></td>
        `;

        const actions = row.querySelector('.table-actions');
        actions.appendChild(createActionButton('Voir', () => showRecoursDetails(recours, fullName, evaluations, status)));

        if (recours.status === 'pending') {
            actions.appendChild(createActionButton('Valider', () => updateStatus(recours, 'validated'), 'btn-secondary'));
            actions.appendChild(createActionButton('Rejeter', () => updateStatus(recours, 'rejected'), 'btn-danger'));
        }

        tbody.appendChild(row);
    });
}

function createActionButton(label, handler, className = 'btn-action') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
}

async function showRecoursDetails(recours, fullName, evaluations, status) {
    await window.AdminUI.showMessage({
        title: `Recours ${recours.course_code}`,
        html: `
            <div class="admin-details-grid">
                <div class="admin-details-row"><strong>Étudiant</strong><span>${escapeHtml(fullName || '-')}</span></div>
                <div class="admin-details-row"><strong>Matricule</strong><span>${escapeHtml(recours.matricule || '-')}</span></div>
                <div class="admin-details-row"><strong>Cours</strong><span>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</span></div>
                <div class="admin-details-row"><strong>Évaluation</strong><span>${escapeHtml(evaluations || '-')}</span></div>
                <div class="admin-details-row"><strong>Statut</strong><span>${escapeHtml(status.label)}</span></div>
                <div class="admin-details-row"><strong>Professeur</strong><span>${escapeHtml(recours.assignedProfessor || '-')}</span></div>
                <div class="admin-details-row"><strong>Décision prof</strong><span>${escapeHtml(recours.professor_decision || '-')}</span></div>
                <div class="admin-details-row is-wide"><strong>Réponse</strong><p>${escapeHtml(recours.professor_response || '-')}</p></div>
                <div class="admin-details-row is-wide"><strong>Justification</strong><p>${escapeHtml(recours.justification || '-')}</p></div>
                <div class="admin-details-row is-wide"><strong>Preuve jointe</strong>${renderProof(recours)}</div>
            </div>
        `,
        variant: 'success',
    });
}

function renderProof(recours) {
    if (!window.FileAttachment) {
        if (!recours.proof_name) return '<span>Aucune</span>';
        if (!recours.proof_path) return `<span>${escapeHtml(recours.proof_name)}</span>`;
        return `<a href="${escapeHtml(API_ORIGIN + recours.proof_path)}" target="_blank" rel="noopener">${escapeHtml(recours.proof_name)}</a>`;
    }

    return window.FileAttachment.render({
        name: recours.proof_name,
        path: recours.proof_path,
        apiOrigin: API_ORIGIN,
        emptyText: 'Aucune preuve jointe',
    });
}

async function updateStatus(recours, status) {
    const label = status === 'validated' ? 'valider' : 'rejeter';
    let successMessage = 'Recours mis à jour.';

    const confirmed = await window.AdminUI.confirmAction({
        title: status === 'validated' ? 'Valider le recours' : 'Rejeter le recours',
        message: `Confirmer l action "${label}" pour le recours ${recours.course_code} ?`,
        confirmText: status === 'validated' ? 'Valider' : 'Rejeter',
        variant: status === 'validated' ? 'success' : 'danger',
        onConfirm: async () => {
            const response = await fetch(`${API_ORIGIN}/api/admin/recours/${recours.id}/status`, {
                method: 'POST',
                headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ status }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Action impossible');
            successMessage = data.message || successMessage;
            await loadAdminDashboard();
        },
    });

    if (confirmed) {
        await window.AdminUI.showMessage({ title: 'Succès', message: successMessage });
    }
}

function getStatus(status) {
    const statuses = {
        pending: { label: 'À traiter', className: 'pending' },
        assigned: { label: 'En traitement', className: 'pending' },
        treated: { label: 'Traité par prof', className: 'success' },
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

    return new Intl.DateTimeFormat('fr-FR').format(new Date(value.replace(' ', 'T')));
}

function emptyRow(colspan, message) {
    return `<tr><td colspan="${colspan}" style="text-align:center;">${escapeHtml(message)}</td></tr>`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
