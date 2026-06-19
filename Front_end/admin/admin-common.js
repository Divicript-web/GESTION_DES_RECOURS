(function () {
    const API_ORIGIN = window.location.protocol.startsWith('http')
        ? window.location.origin
        : 'http://localhost:3001';

    function getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    function authHeaders(extra = {}) {
        return {
            ...extra,
            Authorization: `Bearer ${getToken()}`,
        };
    }

    function ensureModal() {
        let modal = document.getElementById('adminCommonModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'adminCommonModal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-panel" role="dialog" aria-modal="true" aria-labelledby="adminCommonModalTitle">
                <h3 id="adminCommonModalTitle"></h3>
                <div id="adminCommonModalMessage" class="admin-modal-message"></div>
                <div class="admin-modal-actions">
                    <button type="button" class="admin-modal-btn admin-modal-cancel" id="adminCommonModalCancel">Annuler</button>
                    <button type="button" class="admin-modal-btn admin-modal-confirm" id="adminCommonModalConfirm">Confirmer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function closeModal() {
        const modal = document.getElementById('adminCommonModal');
        if (modal) modal.classList.remove('is-open');
    }

    function showMessage({ title = 'Information', message = '', html = '', variant = 'success', buttonText = 'OK' }) {
        return new Promise((resolve) => {
            const modal = ensureModal();
            const panel = modal.querySelector('.admin-modal-panel');
            const titleElement = document.getElementById('adminCommonModalTitle');
            const messageElement = document.getElementById('adminCommonModalMessage');
            const cancelButton = document.getElementById('adminCommonModalCancel');
            const confirmButton = document.getElementById('adminCommonModalConfirm');

            titleElement.textContent = title;
            if (panel) panel.classList.toggle('is-wide', Boolean(html));
            if (html) {
                messageElement.innerHTML = html;
            } else {
                messageElement.textContent = message;
            }
            cancelButton.style.display = 'none';
            confirmButton.textContent = buttonText;
            confirmButton.disabled = false;
            confirmButton.className = `admin-modal-btn admin-modal-confirm ${variant}`;

            const finish = () => {
                confirmButton.removeEventListener('click', finish);
                closeModal();
                resolve();
            };

            confirmButton.addEventListener('click', finish);
            modal.classList.add('is-open');
        });
    }

    function confirmAction({ title = 'Confirmation', message = '', confirmText = 'Confirmer', variant = 'success', onConfirm }) {
        return new Promise((resolve) => {
            const modal = ensureModal();
            const panel = modal.querySelector('.admin-modal-panel');
            const titleElement = document.getElementById('adminCommonModalTitle');
            const messageElement = document.getElementById('adminCommonModalMessage');
            const cancelButton = document.getElementById('adminCommonModalCancel');
            const confirmButton = document.getElementById('adminCommonModalConfirm');

            titleElement.textContent = title;
            if (panel) panel.classList.remove('is-wide');
            messageElement.textContent = message;
            cancelButton.style.display = '';
            cancelButton.textContent = 'Annuler';
            confirmButton.textContent = confirmText;
            confirmButton.disabled = false;
            confirmButton.className = `admin-modal-btn admin-modal-confirm ${variant}`;

            const cleanup = () => {
                cancelButton.removeEventListener('click', cancel);
                confirmButton.removeEventListener('click', confirm);
            };

            const cancel = () => {
                cleanup();
                closeModal();
                resolve(false);
            };

            const confirm = async () => {
                try {
                    confirmButton.disabled = true;
                    confirmButton.textContent = 'Traitement...';
                    if (onConfirm) await onConfirm();
                    cleanup();
                    closeModal();
                    resolve(true);
                } catch (error) {
                    cleanup();
                    closeModal();
                    await showMessage({
                        title: 'Erreur',
                        message: error.message || 'Action impossible pour le moment.',
                        variant: 'danger',
                    });
                    resolve(false);
                }
            };

            cancelButton.addEventListener('click', cancel);
            confirmButton.addEventListener('click', confirm);
            modal.classList.add('is-open');
        });
    }

    async function requireAdminPage(nameElementId) {
        const token = getToken();
        if (!token) {
            window.location.href = '../login.html';
            return null;
        }

        const response = await fetch(`${API_ORIGIN}/profile`, {
            headers: authHeaders(),
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '../login.html';
            return null;
        }

        const user = await response.json();
        if (!['admin', 'superadmin'].includes(user.role)) {
            window.location.href = '../login.html';
            return null;
        }

        const nameElement = nameElementId ? document.getElementById(nameElementId) : null;
        if (nameElement) nameElement.textContent = user.role === 'superadmin' ? 'Superadmin' : 'Admin';
        return user;
    }

    function setupLogout(logoutTrigger, logoutModal, btnCancelLogout, confirmLogout) {
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

    window.AdminUI = {
        API_ORIGIN,
        getToken,
        authHeaders,
        requireAdminPage,
        setupLogout,
        showMessage,
        confirmAction,
    };
}());
