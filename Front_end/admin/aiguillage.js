const API_ORIGIN = window.AdminUI.API_ORIGIN;

let recoursList = [];
let professorList = [];
let currentRecoursId = null;

document.addEventListener('DOMContentLoaded', () => {
    const logoutModal = document.getElementById('logoutModal');
    const logoutTrigger = document.getElementById('logoutTrigger');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    const assignModal = document.getElementById('assignModal');
    const btnCancelAssign = document.getElementById('btnCancelAssign');
    const btnConfirmAssign = document.getElementById('btnConfirmAssign');

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout);
    setupAssignModal(assignModal, btnCancelAssign, btnConfirmAssign);
    window.AdminUI.requireAdminPage().then((admin) => {
        if (admin) loadAiguillage();
    });

    window.addEventListener('click', (event) => {
        if (event.target === assignModal) closeAssignModal();
        if (event.target === logoutModal) logoutModal.style.display = 'none';
    });
});

function setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout) {
    window.AdminUI.setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout);
}

function setupAssignModal(assignModal, btnCancelAssign, btnConfirmAssign) {
    window.openAssignModal = (id) => {
        const recours = recoursList.find((item) => Number(item.id) === Number(id));
        if (!recours) return;

        currentRecoursId = id;
        document.getElementById('profSelect').value = '';
        document.getElementById('assignModalMessage').textContent = '';
        document.getElementById('assignRecoursDetails').innerHTML = renderAssignDetails(recours);
        assignModal.style.display = 'flex';
    };

    if (btnCancelAssign) {
        btnCancelAssign.addEventListener('click', closeAssignModal);
    }

    if (btnConfirmAssign) {
        btnConfirmAssign.addEventListener('click', assignCurrentRecours);
    }
}

async function loadAiguillage() {
    try {
        setLoadingRows();

        const [recoursResponse, professorsResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/api/admin/recours`, {
                headers: window.AdminUI.authHeaders(),
            }),
            fetch(`${API_ORIGIN}/api/admin/professeurs`, {
                headers: window.AdminUI.authHeaders(),
            }),
        ]);

        if (recoursResponse.status === 401 || professorsResponse.status === 401) {
            window.location.href = '../login.html';
            return;
        }

        const recoursData = await recoursResponse.json();
        const professorsData = await professorsResponse.json();

        if (!recoursResponse.ok) throw new Error(recoursData.message || 'Recours introuvables');
        if (!professorsResponse.ok) throw new Error(professorsData.message || 'Professeurs introuvables');

        recoursList = recoursData.recours || [];
        professorList = professorsData.professeurs || [];

        renderProfessorOptions();
        renderTables();
    } catch (error) {
        console.error(error);
        renderErrorRows('Impossible de charger les données d aiguillage.');
    }
}

function setLoadingRows() {
    document.getElementById('to-assign-body').innerHTML = emptyRow(5, 'Chargement...');
    document.getElementById('assigned-body').innerHTML = emptyRow(5, 'Chargement...');
    document.getElementById('to-publish-body').innerHTML = emptyRow(5, 'Chargement...');
}

function renderErrorRows(message) {
    document.getElementById('to-assign-body').innerHTML = emptyRow(5, message);
    document.getElementById('assigned-body').innerHTML = emptyRow(5, message);
    document.getElementById('to-publish-body').innerHTML = emptyRow(5, message);
}

function renderProfessorOptions() {
    const select = document.getElementById('profSelect');

    if (professorList.length === 0) {
        select.innerHTML = '<option value="">Aucun enseignant disponible</option>';
        return;
    }

    select.innerHTML = [
        '<option value="">Sélectionner un enseignant...</option>',
        ...professorList.map((professor) => {
            const name = professor.fullName || [professor.prenom, professor.nom, professor.post_nom].filter(Boolean).join(' ');
            return `<option value="${professor.id}">${escapeHtml(name || professor.matricule)} (${escapeHtml(professor.matricule)})</option>`;
        }),
    ].join('');
}

function renderTables() {
    renderToAssign(recoursList.filter((recours) => recours.status === 'pending'));
    renderAssigned(recoursList.filter((recours) => recours.status === 'assigned'));
    renderToPublish(recoursList.filter((recours) => recours.status === 'treated'));
}

function renderToAssign(items) {
    const tbody = document.getElementById('to-assign-body');

    if (items.length === 0) {
        tbody.innerHTML = emptyRow(5, 'Aucun recours en attente d assignation.');
        return;
    }

    tbody.innerHTML = items.map((recours) => {
        const student = formatStudent(recours);
        const status = getStatus(recours.status);

        return `
            <tr>
                <td>${escapeHtml(recours.matricule)}</td>
                <td>${escapeHtml(student)}</td>
                <td>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</td>
                <td><span class="status ${status.className}">${status.label}</span></td>
                <td><button class="btn-action" type="button" onclick="openAssignModal(${recours.id})">Assigner</button></td>
            </tr>
        `;
    }).join('');
}

function renderAssigned(items) {
    const tbody = document.getElementById('assigned-body');

    if (items.length === 0) {
        tbody.innerHTML = emptyRow(5, 'Aucun recours en traitement.');
        return;
    }

    tbody.innerHTML = items.map((recours) => {
        const status = getStatus(recours.status);
        return `
            <tr>
                <td>${escapeHtml(recours.matricule)}</td>
                <td>${escapeHtml(formatStudent(recours))}</td>
                <td>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</td>
                <td>${escapeHtml(recours.assignedProfessor || '-')}</td>
                <td><span class="status ${status.className}">${status.label}</span></td>
            </tr>
        `;
    }).join('');
}

function renderToPublish(items) {
    const tbody = document.getElementById('to-publish-body');

    if (items.length === 0) {
        tbody.innerHTML = emptyRow(5, 'Aucun recours traité à publier.');
        return;
    }

    tbody.innerHTML = items.map((recours) => {
        const decision = recours.professor_decision || '-';
        const response = recours.professor_response || '-';

        return `
            <tr>
                <td>${escapeHtml(recours.matricule)}</td>
                <td>${escapeHtml(formatStudent(recours))}</td>
                <td>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</td>
                <td><strong>${escapeHtml(decision)}</strong> - ${escapeHtml(response)}</td>
                <td><button class="btn-action-green" type="button" onclick="publishResult(${recours.id})">Publier à l'étudiant</button></td>
            </tr>
        `;
    }).join('');
}

function renderAssignDetails(recours) {
    return `
        <div class="admin-details-row"><strong>Étudiant</strong><span>${escapeHtml(formatStudent(recours))}</span></div>
        <div class="admin-details-row"><strong>Matricule</strong><span>${escapeHtml(recours.matricule || '-')}</span></div>
        <div class="admin-details-row"><strong>Cours</strong><span>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</span></div>
        <div class="admin-details-row is-wide"><strong>Justification</strong><p>${escapeHtml(recours.justification || '-')}</p></div>
        <div class="admin-details-row is-wide"><strong>Preuve jointe</strong>${renderProof(recours)}</div>
    `;
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

async function assignCurrentRecours() {
    const professorId = Number(document.getElementById('profSelect').value);
    const message = document.getElementById('assignModalMessage');
    const button = document.getElementById('btnConfirmAssign');

    if (!currentRecoursId || !professorId) {
        message.textContent = 'Veuillez choisir un enseignant.';
        return;
    }

    try {
        button.disabled = true;
        message.textContent = 'Assignation en cours...';

        const response = await fetch(`${API_ORIGIN}/api/admin/recours/${currentRecoursId}/assigner`, {
            method: 'POST',
            headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ professorId }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Assignation impossible');

        await window.AdminUI.showMessage({ title: 'Succès', message: data.message || 'Assignation réussie.' });
        closeAssignModal();
        await loadAiguillage();
    } catch (error) {
        console.error(error);
        message.textContent = error.message || 'Erreur lors de l assignation.';
    } finally {
        button.disabled = false;
    }
}

async function publishResult(recoursId) {
    let successMessage = 'Réponse publiée.';
    const confirmed = await window.AdminUI.confirmAction({
        title: 'Publier la réponse',
        message: 'Publier cette réponse finale à l étudiant ?',
        confirmText: 'Publier',
        onConfirm: async () => {
            const response = await fetch(`${API_ORIGIN}/api/admin/recours/${recoursId}/publier`, {
                method: 'POST',
                headers: window.AdminUI.authHeaders(),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Publication impossible');

            successMessage = data.message || successMessage;
            await loadAiguillage();
        },
    });

    if (confirmed) {
        await window.AdminUI.showMessage({ title: 'Succès', message: successMessage });
    }
}

function closeAssignModal() {
    currentRecoursId = null;
    document.getElementById('assignModal').style.display = 'none';
}

function getStatus(status) {
    const statuses = {
        pending: { label: 'À assigner', className: 'pending' },
        assigned: { label: 'En traitement', className: 'assigned' },
        treated: { label: 'Traité', className: 'treated' },
        published: { label: 'Publié', className: 'success' },
        validated: { label: 'Validé', className: 'success' },
        success: { label: 'Validé', className: 'success' },
        rejected: { label: 'Rejeté', className: 'danger' },
    };

    return statuses[status] || statuses.pending;
}

function formatStudent(recours) {
    return [recours.prenom, recours.nom, recours.post_nom].filter(Boolean).join(' ') || '-';
}

function emptyRow(colspan, message) {
    return `<tr><td colspan="${colspan}" style="text-align: center;">${escapeHtml(message)}</td></tr>`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
