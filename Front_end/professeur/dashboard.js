const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

let recoursList = [];
let currentRecoursId = null;

document.addEventListener('DOMContentLoaded', () => {
    const logoutTrigger = document.getElementById('logoutTrigger');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    const decisionModal = document.getElementById('decisionModal');
    const btnCancelDecision = document.getElementById('btnCancelDecision');
    const btnSubmitDecision = document.getElementById('btnSubmitDecision');

    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout);
    setupDecisionModal(decisionModal, btnCancelDecision, btnSubmitDecision);
    loadDashboard();

    window.addEventListener('click', (event) => {
        if (event.target === logoutModal) logoutModal.style.display = 'none';
        if (event.target === decisionModal) closeDecisionModal();
    });
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
}

function setupDecisionModal(decisionModal, btnCancelDecision, btnSubmitDecision) {
    window.openDecisionModal = (id) => {
        const recours = recoursList.find((item) => Number(item.id) === Number(id));
        if (!recours) return;

        currentRecoursId = id;
        document.getElementById('decisionSelect').value = '';
        document.getElementById('professorResponse').value = '';
        document.getElementById('decisionMessage').textContent = '';
        document.getElementById('decisionModalTitle').textContent = `Traitement - ${recours.course_code}`;
        document.getElementById('decisionRecoursDetails').innerHTML = renderDetails(recours);
        decisionModal.style.display = 'flex';
    };

    if (btnCancelDecision) {
        btnCancelDecision.addEventListener('click', closeDecisionModal);
    }

    if (btnSubmitDecision) {
        btnSubmitDecision.addEventListener('click', submitTreatment);
    }
}

async function loadDashboard() {
    try {
        const [profileResponse, recoursResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_ORIGIN}/api/professeur/recours`, {
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
        if (!recoursResponse.ok) throw new Error(recoursData.message || 'Recours introuvables');

        renderProfile(profile);
        recoursList = recoursData.recours || [];
        renderRecours();
    } catch (error) {
        console.error(error);
        document.getElementById('recoursBody').innerHTML = emptyRow(6, 'Impossible de charger les recours assignés.');
    }
}

function renderProfile(user) {
    const fullName = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ');
    document.getElementById('professorName').textContent = fullName || 'Professeur';
}

function renderRecours() {
    const assigned = recoursList.filter((recours) => recours.status === 'assigned');
    const submitted = recoursList.filter((recours) => ['treated', 'published'].includes(recours.status));

    document.getElementById('totalAssigned').textContent = recoursList.length;
    document.getElementById('pendingAssigned').textContent = assigned.length;
    document.getElementById('treatedAssigned').textContent = submitted.length;

    const tbody = document.getElementById('recoursBody');
    if (assigned.length === 0) {
        tbody.innerHTML = emptyRow(6, 'Aucun recours à traiter pour le moment.');
        return;
    }

    tbody.innerHTML = assigned.map((recours) => {
        const student = [recours.prenom, recours.nom, recours.post_nom].filter(Boolean).join(' ');
        const evaluations = Array.isArray(recours.evaluation_types) ? recours.evaluation_types.join(', ') : '-';

        return `
            <tr>
                <td>${escapeHtml(recours.matricule)}</td>
                <td>${escapeHtml(student || '-')}</td>
                <td>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</td>
                <td>${escapeHtml(evaluations)}</td>
                <td>${formatDate(recours.assigned_at || recours.created_at)}</td>
                <td><button class="btn-action" type="button" onclick="openDecisionModal(${recours.id})">Traiter</button></td>
            </tr>
        `;
    }).join('');
}

function renderDetails(recours) {
    const evaluations = Array.isArray(recours.evaluation_types) ? recours.evaluation_types.join(', ') : '-';

    return `
        <div><strong>Étudiant</strong><span>${escapeHtml([recours.prenom, recours.nom, recours.post_nom].filter(Boolean).join(' ') || '-')}</span></div>
        <div><strong>Matricule</strong><span>${escapeHtml(recours.matricule || '-')}</span></div>
        <div><strong>Cours</strong><span>${escapeHtml(recours.course_code)} - ${escapeHtml(recours.course_title)}</span></div>
        <div><strong>Type</strong><span>${escapeHtml(evaluations)}</span></div>
        <div><strong>Justification</strong><span>${escapeHtml(recours.justification || '-')}</span></div>
        <div><strong>Preuve</strong><span>${renderProof(recours)}</span></div>
    `;
}

async function submitTreatment() {
    const decision = document.getElementById('decisionSelect').value.trim();
    const responseText = document.getElementById('professorResponse').value.trim();
    const message = document.getElementById('decisionMessage');
    const button = document.getElementById('btnSubmitDecision');

    if (!currentRecoursId || !decision || !responseText) {
        message.textContent = 'Veuillez choisir une décision et saisir une réponse.';
        return;
    }

    try {
        button.disabled = true;
        message.textContent = 'Transmission en cours...';

        const response = await fetch(`${API_ORIGIN}/api/professeur/recours/${currentRecoursId}/traiter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ decision, response: responseText }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Traitement impossible');

        alert(data.message || 'Réponse transmise à l administration.');
        closeDecisionModal();
        await loadDashboard();
    } catch (error) {
        console.error(error);
        message.textContent = error.message || 'Erreur lors du traitement.';
    } finally {
        button.disabled = false;
    }
}

function closeDecisionModal() {
    currentRecoursId = null;
    document.getElementById('decisionModal').style.display = 'none';
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

function emptyRow(colspan, message) {
    return `<tr><td colspan="${colspan}" style="text-align: center;">${escapeHtml(message)}</td></tr>`;
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
