const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const logoutTrigger = document.querySelector('.btn-logout');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const form = document.getElementById('recoursForm');
    const container = document.getElementById('coursesContainer');
    const addBtn = document.getElementById('addCourseBtn');
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    const btnClosePreview = document.getElementById('btnClosePreview');
    const btnEditPreview = document.getElementById('btnEditPreview');
    const btnConfirmSubmit = document.getElementById('btnConfirmSubmit');
    let courseIds = [1];
    let pendingCourses = [];

    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout);
    loadProfile(token);

    addBtn.addEventListener('click', () => {
        const id = getNextId(courseIds);
        if (id === null) return;

        courseIds.push(id);
        container.appendChild(createCourseBlock(id));

        if (courseIds.length === 4) {
            addBtn.style.display = 'none';
        }
    });

    window.confirmDelete = (id) => {
        if (!confirm("Supprimer ce cours ?")) return;

        document.getElementById(`block-${id}`).remove();
        courseIds = courseIds.filter(item => item !== id);
        addBtn.style.display = 'block';
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const courses = collectCourses();
        if (!courses) return;

        pendingCourses = courses;
        previewContent.innerHTML = renderPreview(courses);
        previewModal.style.display = 'flex';
    });

    const closePreview = () => {
        previewModal.style.display = 'none';
    };

    btnClosePreview.addEventListener('click', closePreview);
    btnEditPreview.addEventListener('click', closePreview);

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            closePreview();
        }
    });

    btnConfirmSubmit.addEventListener('click', async () => {
        if (pendingCourses.length === 0) return;

        try {
            btnConfirmSubmit.disabled = true;
            btnConfirmSubmit.querySelector('span').textContent = 'Envoi...';

            const formData = new FormData();
            const coursesPayload = pendingCourses.map(({ proofFile, ...course }) => course);
            formData.append('courses', JSON.stringify(coursesPayload));

            pendingCourses.forEach((course, index) => {
                if (course.proofFile) {
                    formData.append(`proof_${index}`, course.proofFile);
                }
            });

            const response = await fetch(`${API_ORIGIN}/api/recours`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Impossible de soumettre le recours.');
                return;
            }

            alert(data.message || 'Recours soumis avec succès.');
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error(error);
            alert('Serveur inaccessible.');
        } finally {
            btnConfirmSubmit.disabled = false;
            btnConfirmSubmit.querySelector('span').textContent = 'Confirmer l’envoi';
        }
    });
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
}

async function loadProfile(token) {
    try {
        const response = await fetch(`${API_ORIGIN}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;

        const user = await response.json();
        const fullName = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ');
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');

        if (userName) userName.textContent = fullName || 'Étudiant';
        if (userRole) userRole.textContent = `Matricule : ${user.matricule || '-'}`;
    } catch (error) {
        console.error(error);
    }
}

function getNextId(courseIds) {
    for (let i = 1; i <= 4; i++) {
        if (!courseIds.includes(i)) return i;
    }
    return null;
}

function createCourseBlock(id) {
    const newBlock = document.createElement('div');
    newBlock.className = 'course-block';
    newBlock.id = `block-${id}`;
    newBlock.innerHTML = `
        <h4 class="block-title"><i class="fa-solid fa-book"></i> Cours ${id}</h4>
        <div class="form-grid">
            <div class="form-group">
                <label>Cours</label>
                <select class="course-select" required>
                    <option value="ECO-312">ECO-312 : Macroéconomie</option>
                    <option value="INFO-315">INFO-315 : Bases de Données</option>
                </select>
            </div>
            <div class="form-group">
                <label>Type d'évaluation</label>
                <div class="eval-checkboxes">
                    <label><input type="checkbox" value="TP"> TP</label>
                    <label><input type="checkbox" value="TD"> TD</label>
                    <label><input type="checkbox" value="INTERRO"> Interro</label>
                    <label><input type="checkbox" value="EXAMEN"> Examen</label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label>Justification</label>
            <textarea class="details-input" rows="3" required></textarea>
        </div>
        <div class="form-group">
            <label>Preuve</label>
            <div class="file-drop-zone" onclick="this.querySelector('input').click()">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <input type="file" class="file-input" hidden accept=".pdf,.jpg,.png">
                <span class="file-label-text">Choisir un fichier (PDF/Image, max 5Mo)</span>
            </div>
        </div>
        <button type="button" class="btn-remove" onclick="confirmDelete(${id})">Supprimer</button>
    `;
    return newBlock;
}

function collectCourses() {
    const blocks = Array.from(document.querySelectorAll('.course-block'));
    const courses = [];

    for (const block of blocks) {
        const select = block.querySelector('.course-select');
        const selectedOption = select.options[select.selectedIndex];
        const [courseCode, ...titleParts] = selectedOption.textContent.split(':');
        const evaluationTypes = Array.from(block.querySelectorAll('.eval-checkboxes input:checked')).map(input => input.value);
        const justification = block.querySelector('.details-input').value.trim();
        const fileInput = block.querySelector('.file-input');

        if (evaluationTypes.length === 0) {
            alert('Veuillez choisir au moins un type d’évaluation pour chaque cours.');
            return null;
        }

        if (!justification) {
            alert('Veuillez remplir la justification pour chaque cours.');
            return null;
        }

        courses.push({
            courseCode: select.value,
            courseTitle: titleParts.join(':').trim() || courseCode.trim(),
            evaluationTypes,
            justification,
            proofName: fileInput.files[0] ? fileInput.files[0].name : '',
            proofFile: fileInput.files[0] || null,
        });
    }

    return courses;
}

function renderPreview(courses) {
    return courses.map((course, index) => `
        <article class="preview-card">
            <h4>Cours ${index + 1}</h4>
            <div class="preview-grid">
                <div class="preview-field">
                    <strong>Code cours</strong>
                    <span>${escapeHtml(course.courseCode)}</span>
                </div>
                <div class="preview-field">
                    <strong>Intitulé</strong>
                    <span>${escapeHtml(course.courseTitle)}</span>
                </div>
                <div class="preview-field">
                    <strong>Évaluation</strong>
                    <span>${escapeHtml(course.evaluationTypes.join(', '))}</span>
                </div>
                <div class="preview-field">
                    <strong>Preuve</strong>
                    <span>${escapeHtml(course.proofName || 'Aucune')}</span>
                </div>
                <div class="preview-field full">
                    <strong>Justification</strong>
                    <p>${escapeHtml(course.justification)}</p>
                </div>
            </div>
        </article>
    `).join('');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('change', (event) => {
    if (event.target.classList.contains('file-input')) {
        const span = event.target.closest('.file-drop-zone').querySelector('.file-label-text');
        span.textContent = event.target.files[0] ? event.target.files[0].name : "Choisir un fichier";
    }
});
