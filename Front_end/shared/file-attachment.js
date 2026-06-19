(function () {
    const FILE_TYPES = {
        image: {
            label: 'Image',
            icon: 'fa-regular fa-file-image',
            className: '',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
        },
        pdf: {
            label: 'PDF',
            icon: 'fa-regular fa-file-pdf',
            className: 'is-pdf',
            extensions: ['pdf'],
        },
        word: {
            label: 'Word',
            icon: 'fa-regular fa-file-word',
            className: 'is-word',
            extensions: ['doc', 'docx'],
        },
        excel: {
            label: 'Excel',
            icon: 'fa-regular fa-file-excel',
            className: 'is-excel',
            extensions: ['xls', 'xlsx', 'csv'],
        },
        generic: {
            label: 'Fichier',
            icon: 'fa-regular fa-file-lines',
            className: 'is-generic',
            extensions: [],
        },
    };

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getExtension(nameOrPath) {
        const cleanValue = String(nameOrPath || '').split('?')[0].split('#')[0];
        const match = cleanValue.match(/\.([a-zA-Z0-9]+)$/);
        return match ? match[1].toLowerCase() : '';
    }

    function getFileType(name, path) {
        const extension = getExtension(name) || getExtension(path);
        return Object.values(FILE_TYPES).find((type) => type.extensions.includes(extension)) || FILE_TYPES.generic;
    }

    function resolveUrl(path, apiOrigin) {
        if (!path) return '';

        try {
            return new URL(path, apiOrigin || window.location.origin).href;
        } catch (err) {
            return '';
        }
    }

    function render({ name, path, apiOrigin, emptyText = 'Aucun fichier joint' }) {
        const safeName = String(name || '').trim();
        const safePath = String(path || '').trim();

        if (!safeName && !safePath) {
            return `<span class="file-attachment-empty"><i class="fa-regular fa-folder-open"></i>${escapeHtml(emptyText)}</span>`;
        }

        const fileName = safeName || 'Fichier joint';
        const fileUrl = resolveUrl(safePath, apiOrigin);
        const type = getFileType(fileName, safePath);

        if (!fileUrl) {
            return `<span class="file-attachment-error"><i class="fa-solid fa-triangle-exclamation"></i>${escapeHtml(fileName)} - URL indisponible</span>`;
        }

        const actionLabel = type === FILE_TYPES.image ? 'Prévisualiser' : 'Ouvrir';

        return `
            <button class="file-attachment" type="button" data-file-url="${escapeHtml(fileUrl)}" data-file-name="${escapeHtml(fileName)}" data-file-kind="${type.label.toLowerCase()}">
                <span class="file-attachment__icon ${type.className}"><i class="${type.icon}"></i></span>
                <span class="file-attachment__body">
                    <span class="file-attachment__name">${escapeHtml(fileName)}</span>
                    <span class="file-attachment__meta">${escapeHtml(type.label)} - ${escapeHtml(actionLabel)}</span>
                </span>
                <span class="file-attachment__action" aria-hidden="true"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            </button>
        `;
    }

    function ensurePreviewModal() {
        let modal = document.getElementById('filePreviewModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'filePreviewModal';
        modal.className = 'file-preview-modal';
        modal.innerHTML = `
            <div class="file-preview-modal__panel" role="dialog" aria-modal="true" aria-labelledby="filePreviewTitle">
                <div class="file-preview-modal__header">
                    <h3 class="file-preview-modal__title" id="filePreviewTitle"></h3>
                    <button class="file-preview-modal__close" type="button" aria-label="Fermer">&times;</button>
                </div>
                <div class="file-preview-modal__body" id="filePreviewBody"></div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.file-preview-modal__close').addEventListener('click', closePreview);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closePreview();
        });

        return modal;
    }

    function closePreview() {
        const modal = document.getElementById('filePreviewModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        const body = document.getElementById('filePreviewBody');
        if (body) body.innerHTML = '';
    }

    function openImagePreview(fileUrl, fileName) {
        const modal = ensurePreviewModal();
        const title = document.getElementById('filePreviewTitle');
        const body = document.getElementById('filePreviewBody');

        title.textContent = fileName || 'Fichier image';
        body.innerHTML = `<img src="${escapeHtml(fileUrl)}" alt="${escapeHtml(fileName || 'Aperçu du fichier')}">`;

        const image = body.querySelector('img');
        image.addEventListener('error', () => {
            body.innerHTML = '<p class="file-preview-modal__message">Impossible de charger cette image. Le fichier est peut-être introuvable.</p>';
        });

        modal.classList.add('is-open');
    }

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.file-attachment');
        if (!trigger) return;

        const fileUrl = trigger.dataset.fileUrl;
        const fileName = trigger.dataset.fileName || 'Fichier joint';
        const kind = trigger.dataset.fileKind;

        if (!fileUrl) return;

        if (kind === 'image') {
            openImagePreview(fileUrl, fileName);
            return;
        }

        window.open(fileUrl, '_blank', 'noopener');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closePreview();
    });

    window.FileAttachment = {
        render,
        getFileType,
        resolveUrl,
    };
}());
