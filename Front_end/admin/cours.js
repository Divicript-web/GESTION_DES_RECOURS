const API_ORIGIN = window.AdminUI.API_ORIGIN;
const token = window.AdminUI.getToken();

let courses = [];
let professors = [];

document.addEventListener('DOMContentLoaded', async () => {
    window.AdminUI.setupLogout(
        document.getElementById('logoutTrigger'),
        document.getElementById('logoutModal'),
        document.getElementById('btnCancelLogout'),
        document.getElementById('confirmLogout')
    );

    const admin = await window.AdminUI.requireAdminPage('adminName');
    if (!admin) return;

    setupEvents();
    setupPromotionSelect();
    await loadPageData();
});

function setupPromotionSelect(selectedValue = '') {
    const select = document.getElementById('promosCours');
    if (!select || !window.PromotionOptions) return;

    select.innerHTML = window.PromotionOptions.values
        .map((promotion) => `<option value="${promotion}">${promotion}</option>`)
        .join('');

    const values = String(selectedValue || '')
        .split(',')
        .map((item) => window.PromotionOptions.normalize(item))
        .filter(Boolean);

    Array.from(select.options).forEach((option) => {
        option.selected = values.includes(option.value);
    });
}

function getSelectedPromotions() {
    const select = document.getElementById('promosCours');
    if (!select) return '';
    return Array.from(select.selectedOptions).map((option) => option.value).join(', ');
}

function getSelectedTeacherName() {
    const select = document.getElementById('ensResponsable');
    if (!select) return '';
    return select.value.trim();
}

function setupEvents() {
    document.getElementById('openCoursButton').addEventListener('click', () => openCoursModal());
    document.getElementById('btnCancelCours').addEventListener('click', closeCoursModal);
    document.getElementById('btnSaveCours').addEventListener('click', saveCourse);
    document.getElementById('searchCoursButton').addEventListener('click', renderCourses);
    document.getElementById('searchCours').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') renderCourses();
    });

    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('coursModal')) closeCoursModal();
    });
}

async function loadPageData() {
    try {
        document.getElementById('cours-body').innerHTML = emptyRow(7, 'Chargement...');
        const [coursesResponse, professorsResponse] = await Promise.all([
            fetch(`${API_ORIGIN}/api/admin/cours`, {
                headers: window.AdminUI.authHeaders(),
            }),
            fetch(`${API_ORIGIN}/api/admin/professeurs`, {
                headers: window.AdminUI.authHeaders(),
            }),
        ]);
        const coursesData = await coursesResponse.json();
        const professorsData = await professorsResponse.json();

        if (!coursesResponse.ok) throw new Error(coursesData.message || 'Cours introuvables');
        if (!professorsResponse.ok) throw new Error(professorsData.message || 'Professeurs introuvables');

        courses = coursesData.courses || [];
        professors = professorsData.professeurs || [];
        renderProfessorOptions();
        renderCourses();
    } catch (error) {
        document.getElementById('cours-body').innerHTML = emptyRow(7, 'Impossible de charger les cours.');
        await window.AdminUI.showMessage({ title: 'Erreur', message: error.message, variant: 'danger' });
    }
}

function renderProfessorOptions() {
    const select = document.getElementById('ensResponsable');
    select.innerHTML = [
        '<option value="">Enseignant responsable</option>',
        ...professors.map((professor) => {
            const name = professor.fullName || [professor.prenom, professor.nom, professor.post_nom].filter(Boolean).join(' ');
            return `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${escapeHtml(professor.matricule)})</option>`;
        }),
    ].join('');
}

function renderCourses() {
    const tbody = document.getElementById('cours-body');
    const search = document.getElementById('searchCours').value.trim().toLowerCase();
    const filtered = courses.filter((course) => {
        const text = `${course.code} ${course.title} ${course.departement || ''} ${course.promotions || ''} ${course.teacher_name || ''}`.toLowerCase();
        return !search || text.includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = emptyRow(7, 'Aucun cours trouvé.');
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach((course) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(course.code)}</strong></td>
            <td>${escapeHtml(course.title)}</td>
            <td>${escapeHtml(course.credits ?? '-')}</td>
            <td>${escapeHtml(course.departement || '-')}</td>
            <td>${escapeHtml(course.promotions || '-')}</td>
            <td>${escapeHtml(course.teacher_name || '-')}</td>
            <td>
                <button type="button" class="btn-action-sm">Modifier</button>
                <button type="button" class="btn-danger">Supprimer</button>
            </td>
        `;
        row.querySelector('.btn-action-sm').addEventListener('click', () => openCoursModal(course));
        row.querySelector('.btn-danger').addEventListener('click', () => deleteCourse(course));
        tbody.appendChild(row);
    });
}

function openCoursModal(course = null) {
    document.getElementById('coursId').value = course ? course.id : '';
    document.getElementById('codeCours').value = course ? course.code : '';
    document.getElementById('nomCours').value = course ? course.title : '';
    document.getElementById('creditsCours').value = course && course.credits !== null ? course.credits : '';
    document.getElementById('deptCours').value = course ? course.departement || '' : '';
    document.getElementById('ensResponsable').value = course ? course.teacher_name || '' : '';
    setupPromotionSelect(course ? course.promotions || '' : '');
    document.getElementById('coursFormMessage').textContent = '';
    document.querySelector('#coursModal h3').textContent = course ? 'Modifier le cours' : 'Nouveau cours';
    document.getElementById('coursModal').style.display = 'flex';
}

function closeCoursModal() {
    document.getElementById('coursModal').style.display = 'none';
}

async function saveCourse() {
    const id = document.getElementById('coursId').value;
    const payload = {
        code: document.getElementById('codeCours').value.trim(),
        title: document.getElementById('nomCours').value.trim(),
        credits: document.getElementById('creditsCours').value,
        departement: document.getElementById('deptCours').value.trim(),
        teacherName: getSelectedTeacherName(),
        promotions: getSelectedPromotions(),
    };

    if (!payload.code || !payload.title) {
        document.getElementById('coursFormMessage').textContent = 'Le code et le nom du cours sont obligatoires.';
        return;
    }

    if (!payload.teacherName) {
        document.getElementById('coursFormMessage').textContent = 'Choisissez un enseignant responsable pour ce cours.';
        return;
    }

    if (!payload.promotions) {
        document.getElementById('coursFormMessage').textContent = 'Choisissez au moins une promotion pour ce cours.';
        return;
    }

    try {
        const response = await fetch(`${API_ORIGIN}/api/admin/cours${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Enregistrement impossible');

        closeCoursModal();
        await loadPageData();
        await window.AdminUI.showMessage({ title: 'Succès', message: data.message || 'Cours enregistré.' });
    } catch (error) {
        document.getElementById('coursFormMessage').textContent = error.message;
    }
}

async function deleteCourse(course) {
    let successMessage = 'Cours supprimé.';
    const confirmed = await window.AdminUI.confirmAction({
        title: 'Supprimer le cours',
        message: `Supprimer définitivement ${course.code} - ${course.title} ?`,
        confirmText: 'Supprimer',
        variant: 'danger',
        onConfirm: async () => {
            const response = await fetch(`${API_ORIGIN}/api/admin/cours/${course.id}`, {
                method: 'DELETE',
                headers: window.AdminUI.authHeaders(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Suppression impossible');
            successMessage = data.message || successMessage;
            await loadPageData();
        },
    });

    if (confirmed) {
        await window.AdminUI.showMessage({ title: 'Succès', message: successMessage });
    }
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
