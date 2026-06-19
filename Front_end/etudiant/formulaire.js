const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];

const FILE_TYPES = {
    image: { label: 'Image', icon: 'fa-regular fa-file-image', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
    pdf: { label: 'PDF', icon: 'fa-regular fa-file-pdf', extensions: ['pdf'] },
    word: { label: 'Word', icon: 'fa-regular fa-file-word', extensions: ['doc', 'docx'] },
    excel: { label: 'Excel', icon: 'fa-regular fa-file-excel', extensions: ['xls', 'xlsx', 'csv'] },
    generic: { label: 'Fichier', icon: 'fa-regular fa-file-lines', extensions: ['txt'] },
};

let courseIds = [1];
let pendingCourses = [];
let isSubmitting = false;
let availableCourses = [];

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

    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    setupLogout(logoutTrigger, logoutModal, btnCancelLogout);
    setupFeedbackModal();
    setupFileInteractions();
    loadProfile(token);
    loadCourses(token);

    addBtn.addEventListener('click', () => {
        const id = getNextId(courseIds);
        if (id === null) return;

        courseIds.push(id);
        container.appendChild(createCourseBlock(id));
        populateCourseSelects();

        if (courseIds.length === 4) {
            addBtn.style.display = 'none';
        }
    });

    window.confirmDelete = async (id) => {
        const confirmed = await showFeedbackModal({
            title: 'Supprimer ce cours',
            message: 'Retirer ce cours du recours avant l’envoi ?',
            variant: 'warning',
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
        });

        if (!confirmed) return;

        const block = document.getElementById(`block-${id}`);
        if (block) releasePreviewUrl(block.querySelector('.file-input'));
        if (block) block.remove();
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
        if (!isSubmitting) previewModal.style.display = 'none';
    };

    btnClosePreview.addEventListener('click', closePreview);
    btnEditPreview.addEventListener('click', closePreview);

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) closePreview();
    });

    btnConfirmSubmit.addEventListener('click', async () => {
        if (pendingCourses.length === 0 || isSubmitting) return;

        try {
            isSubmitting = true;
            btnConfirmSubmit.disabled = true;
            btnEditPreview.disabled = true;
            btnClosePreview.disabled = true;
            btnConfirmSubmit.querySelector('span').textContent = 'Envoi en cours...';

            const formData = new FormData();
            const coursesPayload = pendingCourses.map((course) => ({
                courseCode: course.courseCode,
                courseTitle: course.courseTitle,
                evaluationTypes: course.evaluationTypes,
                justification: course.justification,
                proofName: course.proofName,
            }));
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
                await showFeedbackModal({
                    title: 'Envoi impossible',
                    message: data.message || 'Impossible de soumettre le recours.',
                    variant: 'danger',
                    confirmText: 'Compris',
                });
                return;
            }

            previewModal.style.display = 'none';
            await showFeedbackModal({
                title: 'Recours déposé',
                message: data.message || 'Votre recours a été soumis avec succès.',
                variant: 'success',
                confirmText: 'Voir mon suivi',
            });
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error(error);
            await showFeedbackModal({
                title: 'Serveur inaccessible',
                message: 'Vérifiez votre connexion puis réessayez.',
                variant: 'danger',
                confirmText: 'OK',
            });
        } finally {
            isSubmitting = false;
            btnConfirmSubmit.disabled = false;
            btnEditPreview.disabled = false;
            btnClosePreview.disabled = false;
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

function setupFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    const cancelButton = document.getElementById('feedbackModalCancel');

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            resolveFeedbackModal(false);
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            resolveFeedbackModal(false);
        }
    });

    if (cancelButton) {
        cancelButton.addEventListener('click', () => resolveFeedbackModal(false));
    }
}

function showFeedbackModal({ title, message, variant = 'info', confirmText = 'OK', cancelText = '' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('feedbackModal');
        const icon = document.getElementById('feedbackModalIcon');
        const titleElement = document.getElementById('feedbackModalTitle');
        const messageElement = document.getElementById('feedbackModalMessage');
        const confirmButton = document.getElementById('feedbackModalConfirm');
        const cancelButton = document.getElementById('feedbackModalCancel');

        modal.dataset.resolveId = String(Date.now());
        modal._resolve = resolve;
        icon.className = `feedback-modal-icon ${variant}`;
        icon.innerHTML = `<i class="${getFeedbackIcon(variant)}"></i>`;
        titleElement.textContent = title;
        messageElement.textContent = message;
        confirmButton.textContent = confirmText;
        cancelButton.textContent = cancelText || 'Annuler';
        cancelButton.style.display = cancelText ? '' : 'none';

        confirmButton.onclick = () => resolveFeedbackModal(true);
        modal.style.display = 'flex';
    });
}

function resolveFeedbackModal(value) {
    const modal = document.getElementById('feedbackModal');
    if (!modal || modal.style.display !== 'flex') return;

    modal.style.display = 'none';
    const confirmButton = document.getElementById('feedbackModalConfirm');
    if (confirmButton) confirmButton.onclick = null;

    if (modal._resolve) {
        modal._resolve(value);
        modal._resolve = null;
    }
}

function getFeedbackIcon(variant) {
    const icons = {
        success: 'fa-solid fa-circle-check',
        danger: 'fa-solid fa-triangle-exclamation',
        warning: 'fa-solid fa-circle-question',
        info: 'fa-solid fa-circle-info',
    };
    return icons[variant] || icons.info;
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

async function loadCourses(token) {
    const addBtn = document.getElementById('addCourseBtn');
    const submitBtn = document.querySelector('.btn-submit[type="submit"]');

    try {
        const response = await fetch(`${API_ORIGIN}/api/cours`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Impossible de charger les cours.');
        }

        availableCourses = Array.isArray(data.courses) ? data.courses : [];
        populateCourseSelects();

        if (availableCourses.length === 0) {
            if (addBtn) addBtn.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            await showFeedbackModal({
                title: 'Aucun cours disponible',
                message: 'Aucun cours n’est enregistré dans la base de données. Contactez l’administration avant de déposer un recours.',
                variant: 'warning',
                confirmText: 'Compris',
            });
        }
    } catch (error) {
        console.error(error);
        availableCourses = [];
        populateCourseSelects();
        if (addBtn) addBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        await showFeedbackModal({
            title: 'Cours indisponibles',
            message: error.message || 'Impossible de charger les cours depuis la base de données.',
            variant: 'danger',
            confirmText: 'OK',
        });
    }
}

function populateCourseSelects() {
    document.querySelectorAll('.course-select').forEach((select) => {
        const currentValue = select.value;
        select.innerHTML = buildCourseOptions(currentValue);
        select.disabled = availableCourses.length === 0;
    });
}

function buildCourseOptions(selectedValue = '') {
    if (availableCourses.length === 0) {
        return '<option value="">Aucun cours enregistré</option>';
    }

    return [
        '<option value="">Choisir un cours...</option>',
        ...availableCourses.map((course) => {
            const selected = String(course.code) === String(selectedValue) ? ' selected' : '';
            return `<option value="${escapeHtml(course.code)}" data-title="${escapeHtml(course.title)}"${selected}>${escapeHtml(course.code)} : ${escapeHtml(course.title)}</option>`;
        }),
    ].join('');
}

function setupFileInteractions() {
    document.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.btn-remove-file');
        const previewButton = event.target.closest('.btn-preview-file');
        const dropZone = event.target.closest('.file-drop-zone');

        if (removeButton) {
            const block = removeButton.closest('.course-block');
            const fileInput = block.querySelector('.file-input');
            releasePreviewUrl(fileInput);
            fileInput.value = '';
            renderSelectedFile(block, null);
            return;
        }

        if (previewButton) {
            event.preventDefault();
            const url = previewButton.dataset.previewUrl;
            if (url) window.open(url, '_blank', 'noopener');
            return;
        }

        if (dropZone) {
            dropZone.querySelector('.file-input').click();
        }
    });

    document.addEventListener('keydown', (event) => {
        const dropZone = event.target.closest('.file-drop-zone');
        if (!dropZone || !['Enter', ' '].includes(event.key)) return;

        event.preventDefault();
        dropZone.querySelector('.file-input').click();
    });

    document.addEventListener('change', async (event) => {
        if (!event.target.classList.contains('file-input')) return;

        const fileInput = event.target;
        const block = fileInput.closest('.course-block');
        const file = fileInput.files[0] || null;

        clearCourseError(block);

        if (!file) {
            renderSelectedFile(block, null);
            return;
        }

        const validationError = validateFile(file);
        if (validationError) {
            releasePreviewUrl(fileInput);
            fileInput.value = '';
            renderSelectedFile(block, null);
            showCourseError(block, validationError);
            await showFeedbackModal({
                title: 'Fichier non accepté',
                message: validationError,
                variant: 'danger',
                confirmText: 'Choisir un autre fichier',
            });
            return;
        }

        releasePreviewUrl(fileInput);
        fileInput.dataset.previewUrl = URL.createObjectURL(file);
        renderSelectedFile(block, file);
    });
}

function getNextId(ids) {
    for (let i = 1; i <= 4; i++) {
        if (!ids.includes(i)) return i;
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
                <label>Cours concerné</label>
                <select class="course-select" required>
                    ${buildCourseOptions()}
                </select>
            </div>
            <div class="form-group">
                <label>Type de recours / évaluation concernée</label>
                <div class="eval-checkboxes">
                    <label><input type="checkbox" value="TP"> TP</label>
                    <label><input type="checkbox" value="TD"> TD</label>
                    <label><input type="checkbox" value="INTERRO"> Interro</label>
                    <label><input type="checkbox" value="EXAMEN"> Examen</label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label>Motif du recours</label>
            <select class="reason-select" required>
                <option value="">Choisir le motif du recours...</option>
                <option value="Note manquante">Note manquante</option>
                <option value="Erreur de cotation">Erreur de cotation</option>
                <option value="Erreur de transcription">Erreur de transcription</option>
                <option value="Autre motif académique">Autre motif académique</option>
            </select>
            <label class="sub-label">Description détaillée</label>
            <textarea class="details-input" rows="5" minlength="20" placeholder="Décrivez précisément la situation, les questions concernées et les éléments à vérifier." required></textarea>
            <p class="field-help">Minimum 20 caractères pour faciliter le traitement.</p>
        </div>
        <div class="form-group">
            <label>Pièce jointe (Preuve)</label>
            <div class="file-drop-zone" role="button" tabindex="0">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <input type="file" class="file-input" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt">
                <span class="file-label-text">Choisir un fichier</span>
                <span class="file-specs">PDF, image, Word, Excel, CSV ou TXT - max 5Mo</span>
            </div>
            <div class="file-selected" aria-live="polite"></div>
        </div>
        <p class="course-error" aria-live="polite"></p>
        <button type="button" class="btn-remove" onclick="confirmDelete(${id})">Supprimer</button>
    `;
    return newBlock;
}

function collectCourses() {
    const blocks = Array.from(document.querySelectorAll('.course-block'));
    const courses = [];

    for (const block of blocks) {
        clearCourseError(block);

        const select = block.querySelector('.course-select');
        const selectedOption = select.options[select.selectedIndex];
        const courseTitle = selectedOption ? (selectedOption.dataset.title || selectedOption.textContent.split(':').slice(1).join(':').trim()) : '';
        const evaluationTypes = Array.from(block.querySelectorAll('.eval-checkboxes input:checked')).map(input => input.value);
        const reason = block.querySelector('.reason-select').value.trim();
        const description = block.querySelector('.details-input').value.trim();
        const fileInput = block.querySelector('.file-input');
        const file = fileInput.files[0] || null;

        if (availableCourses.length === 0) {
            return stopOnValidationError(block, 'Aucun cours n’est enregistré dans la base de données.');
        }

        if (!select.value) {
            return stopOnValidationError(block, 'Veuillez choisir le cours concerné.');
        }

        if (!availableCourses.some((course) => String(course.code) === String(select.value))) {
            return stopOnValidationError(block, 'Le cours sélectionné n’existe pas dans la base de données.');
        }

        if (evaluationTypes.length === 0) {
            return stopOnValidationError(block, 'Veuillez choisir au moins un type d’évaluation pour chaque cours.');
        }

        if (!reason) {
            return stopOnValidationError(block, 'Veuillez choisir le motif du recours.');
        }

        if (description.length < 20) {
            return stopOnValidationError(block, 'La description doit contenir au moins 20 caractères.');
        }

        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                return stopOnValidationError(block, validationError);
            }
        }

        courses.push({
            courseCode: select.value,
            courseTitle: courseTitle || select.value,
            evaluationTypes,
            reason,
            description,
            justification: `Motif: ${reason}\nDescription: ${description}`,
            proofName: file ? file.name : '',
            proofFile: file,
            proofPreviewUrl: fileInput.dataset.previewUrl || '',
        });
    }

    return courses;
}

function stopOnValidationError(block, message) {
    showCourseError(block, message);
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showFeedbackModal({
        title: 'Formulaire incomplet',
        message,
        variant: 'warning',
        confirmText: 'Corriger',
    });
    return null;
}

function validateFile(file) {
    const extension = getExtension(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        return 'Format non autorisé. Utilisez PDF, image, Word, Excel, CSV ou TXT.';
    }

    if (file.size > MAX_FILE_SIZE) {
        return 'Le fichier est trop lourd. Taille maximale autorisée : 5Mo.';
    }

    return '';
}

function renderSelectedFile(block, file) {
    const target = block.querySelector('.file-selected');
    if (!target) return;

    if (!file) {
        target.innerHTML = '';
        return;
    }

    const fileType = getFileType(file.name);
    const previewUrl = block.querySelector('.file-input').dataset.previewUrl || '';
    const isImage = fileType.label === 'Image';
    const isPdf = fileType.label === 'PDF';

    target.innerHTML = `
        <article class="selected-file-card">
            ${isImage ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(file.name)}" class="selected-file-thumb">` : ''}
            <div class="selected-file-icon ${fileType.className}">
                <i class="${fileType.icon}"></i>
            </div>
            <div class="selected-file-info">
                <strong>${escapeHtml(file.name)}</strong>
                <span>${escapeHtml(fileType.label)} - ${formatFileSize(file.size)}</span>
            </div>
            ${isPdf ? `<button type="button" class="btn-preview-file" data-preview-url="${escapeHtml(previewUrl)}" title="Ouvrir le PDF"><i class="fa-solid fa-eye"></i></button>` : ''}
            <button type="button" class="btn-remove-file" title="Retirer le fichier"><i class="fa-solid fa-xmark"></i></button>
        </article>
    `;
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
                    <strong>Type d'évaluation</strong>
                    <span>${escapeHtml(course.evaluationTypes.join(', '))}</span>
                </div>
                <div class="preview-field">
                    <strong>Motif</strong>
                    <span>${escapeHtml(course.reason)}</span>
                </div>
                <div class="preview-field full">
                    <strong>Description détaillée</strong>
                    <p>${escapeHtml(course.description)}</p>
                </div>
                <div class="preview-field full">
                    <strong>Fichier justificatif</strong>
                    ${renderPreviewFile(course)}
                </div>
            </div>
        </article>
    `).join('');
}

function renderPreviewFile(course) {
    if (!course.proofFile) {
        return '<span class="empty-file-state"><i class="fa-regular fa-folder-open"></i> Aucun fichier joint</span>';
    }

    const fileType = getFileType(course.proofName);
    const isImage = fileType.label === 'Image';
    const isPdf = fileType.label === 'PDF';

    return `
        <div class="preview-file-card">
            ${isImage ? `<img src="${escapeHtml(course.proofPreviewUrl)}" alt="${escapeHtml(course.proofName)}">` : `<span class="selected-file-icon ${fileType.className}"><i class="${fileType.icon}"></i></span>`}
            <div>
                <strong>${escapeHtml(course.proofName)}</strong>
                <span>${escapeHtml(fileType.label)} - ${formatFileSize(course.proofFile.size)}</span>
            </div>
            ${isPdf ? `<button type="button" class="btn-preview-file" data-preview-url="${escapeHtml(course.proofPreviewUrl)}" title="Ouvrir le PDF"><i class="fa-solid fa-eye"></i></button>` : ''}
        </div>
    `;
}

function getFileType(fileName) {
    const extension = getExtension(fileName);
    const type = Object.values(FILE_TYPES).find((item) => item.extensions.includes(extension)) || FILE_TYPES.generic;
    return {
        ...type,
        className: `type-${type.label.toLowerCase()}`,
    };
}

function getExtension(fileName) {
    const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
}

function formatFileSize(size) {
    if (!size) return '0 Ko';
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function showCourseError(block, message) {
    block.classList.add('has-error');
    const error = block.querySelector('.course-error');
    if (error) error.textContent = message;
}

function clearCourseError(block) {
    block.classList.remove('has-error');
    const error = block.querySelector('.course-error');
    if (error) error.textContent = '';
}

function releasePreviewUrl(fileInput) {
    if (fileInput && fileInput.dataset.previewUrl) {
        URL.revokeObjectURL(fileInput.dataset.previewUrl);
        delete fileInput.dataset.previewUrl;
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
