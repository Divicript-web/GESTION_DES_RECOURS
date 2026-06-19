const API_ORIGIN = window.AdminUI.API_ORIGIN;
const API_BASE = `${API_ORIGIN}/api/etudiant`;
const token = window.AdminUI.getToken();

let allUsers = [];
let currentUserRole = null;
let activeRoleFilter = 'tous';

document.addEventListener('DOMContentLoaded', async () => {
    window.AdminUI.setupLogout(
        document.getElementById('logoutTrigger'),
        document.getElementById('logoutModal'),
        document.getElementById('btnCancelLogout'),
        document.getElementById('confirmLogout')
    );

    try {
        const admin = await window.AdminUI.requireAdminPage('adminName');
        if (!admin) return;
        currentUserRole = admin.role;
        setupPromotionControls();
        configureRoleControls();
        setupEvents();
        await loadUsers();
    } catch (error) {
        await window.AdminUI.showMessage({
            title: 'Erreur',
            message: 'Impossible de charger le profil administrateur.',
            variant: 'danger',
        });
    }
});

function setupEvents() {
    document.getElementById('btnCancelUser').addEventListener('click', closeUserModal);
    document.getElementById('btnSaveUser').addEventListener('click', saveNewUser);
    document.getElementById('roleSelector').addEventListener('change', toggleFields);
    document.getElementById('searchButton').addEventListener('click', applyFilters);
    document.getElementById('searchInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') applyFilters();
    });

    document.getElementById('btnCancelReset').addEventListener('click', closeResetModal);
    document.getElementById('btnSaveReset').addEventListener('click', saveResetPassword);
}

function setupPromotionControls() {
    setPromotionSelect('etudiantPromo');
    setPromotionSelect('ensPromos', '', true);
    setPromotionSelect('editPromotion', '', true);
}

function setPromotionSelect(id, value = '', multiple = false) {
    const select = document.getElementById(id);
    if (!select || !window.PromotionOptions) return;

    select.innerHTML = multiple
        ? window.PromotionOptions.values.map((promotion) => `<option value="${promotion}">${promotion}</option>`).join('')
        : window.PromotionOptions.options(value);

    const values = String(value || '')
        .split(',')
        .map((item) => window.PromotionOptions.normalize(item))
        .filter(Boolean);

    Array.from(select.options).forEach((option) => {
        option.selected = values.includes(option.value);
    });
}

function getPromotionValue(id, { multiple = false } = {}) {
    const select = document.getElementById(id);
    if (!select) return '';
    if (!multiple) return select.value;
    return Array.from(select.selectedOptions).map((option) => option.value).filter(Boolean).join(', ');
}

function configureRoleControls() {
    const adminOptions = document.querySelectorAll('[data-superadmin-only], #editRole option[value="admin"], #editRole option[value="superadmin"]');
    adminOptions.forEach((option) => {
        option.hidden = currentUserRole !== 'superadmin';
        option.disabled = currentUserRole !== 'superadmin';
    });
}

async function loadUsers() {
    renderUsersLoading();

    try {
        const response = await fetch(`${API_BASE}/users/all`, {
            headers: window.AdminUI.authHeaders(),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Erreur lors du chargement des utilisateurs');

        allUsers = data.users || [];
        applyFilters();
    } catch (error) {
        document.getElementById('user-body').innerHTML = emptyRow(9, 'Erreur lors du chargement des utilisateurs.');
        await window.AdminUI.showMessage({ title: 'Erreur', message: error.message, variant: 'danger' });
    }
}

function renderUsersLoading() {
    document.getElementById('user-body').innerHTML = emptyRow(9, 'Chargement...');
}

function displayUsers(users) {
    const userBody = document.getElementById('user-body');

    if (!users || users.length === 0) {
        userBody.innerHTML = emptyRow(9, 'Aucun utilisateur trouvé.');
        return;
    }

    userBody.innerHTML = '';
    users.forEach((user) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(user.matricule || '')}</td>
            <td>${escapeHtml(user.email || '-')}</td>
            <td>${escapeHtml(user.nom || '')}</td>
            <td>${escapeHtml(user.post_nom || '')}</td>
            <td>${escapeHtml(user.prenom || '')}</td>
            <td>${getRoleLabel(user.role)}</td>
            <td>${escapeHtml(user.promotion || '-')}</td>
            <td><button type="button" class="btn-action-sm">Modifier</button></td>
            <td>
                <button type="button" class="btn-secondary"><i class="fa-solid fa-key"></i> MDP</button>
                <button type="button" class="btn-danger"><i class="fa-solid fa-trash"></i> Supprimer</button>
            </td>
        `;

        row.querySelector('.btn-action-sm').addEventListener('click', () => openEditModal(user));
        row.querySelector('.btn-secondary').addEventListener('click', () => openResetModal(user.matricule));
        row.querySelector('.btn-danger').addEventListener('click', () => deleteSelectedUser(user));
        userBody.appendChild(row);
    });
}

function openUserModal() {
    document.getElementById('roleSelector').value = 'etudiant';
    ['nom', 'postnom', 'prenom', 'matricule', 'email', 'password', 'confirmPassword', 'etudiantDept', 'etudiantPromo', 'ensPromos', 'ensDept', 'adminDept'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    document.getElementById('userFormMessage').textContent = '';
    toggleFields();
    configureRoleControls();
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

function openEditModal(user) {
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editMatricule').value = user.matricule || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editNom').value = user.nom || '';
    document.getElementById('editPostnom').value = user.post_nom || '';
    document.getElementById('editPrenom').value = user.prenom || '';
    document.getElementById('editRole').value = user.role || 'etudiant';
    document.getElementById('editDepartement').value = user.departement || '';
    setPromotionSelect('editPromotion', user.promotion || '', user.role !== 'etudiant');
    document.getElementById('editPromotion').multiple = user.role !== 'etudiant';
    document.getElementById('editFormMessage').textContent = '';
    configureRoleControls();
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveNewUser() {
    const role = document.getElementById('roleSelector').value;
    const payload = {
        role,
        nom: document.getElementById('nom').value.trim(),
        postnom: document.getElementById('postnom').value.trim(),
        prenom: document.getElementById('prenom').value.trim(),
        matricule: document.getElementById('matricule').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        departement: getDepartementForRole(role),
        promotion: role === 'etudiant'
            ? getPromotionValue('etudiantPromo')
            : getPromotionValue('ensPromos', { multiple: true }),
    };

    const validation = validateNewUser(payload);
    if (validation) {
        document.getElementById('userFormMessage').textContent = validation;
        return;
    }

    try {
        setButtonLoading('btnSaveUser', true);
        const response = await fetch(`${API_BASE}/add`, {
            method: 'POST',
            headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Erreur lors de la création');

        closeUserModal();
        await loadUsers();
        await window.AdminUI.showMessage({ title: 'Succès', message: data.message || 'Utilisateur ajouté avec succès.' });
    } catch (error) {
        document.getElementById('userFormMessage').textContent = error.message;
    } finally {
        setButtonLoading('btnSaveUser', false, 'Enregistrer');
    }
}

async function saveUserChanges() {
    const role = document.getElementById('editRole').value;
    const payload = {
        id: Number(document.getElementById('editUserId').value),
        matricule: document.getElementById('editMatricule').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        nom: document.getElementById('editNom').value.trim(),
        post_nom: document.getElementById('editPostnom').value.trim(),
        prenom: document.getElementById('editPrenom').value.trim(),
        role,
        departement: document.getElementById('editDepartement').value.trim(),
        promotion: role === 'etudiant'
            ? getPromotionValue('editPromotion')
            : getPromotionValue('editPromotion', { multiple: true }),
    };

    if (['admin', 'superadmin'].includes(role) && currentUserRole !== 'superadmin') {
        document.getElementById('editFormMessage').textContent = 'Seul le superadmin peut attribuer un rôle administrateur.';
        return;
    }

    if (!payload.id || !payload.matricule || !payload.nom || !payload.post_nom || !payload.prenom || !payload.role) {
        document.getElementById('editFormMessage').textContent = 'Tous les champs principaux sont requis.';
        return;
    }

    if (payload.role === 'etudiant' && (!payload.departement || !isValidPromotion(payload.promotion))) {
        document.getElementById('editFormMessage').textContent = 'Département et promotion valide sont requis pour un étudiant.';
        return;
    }

    if (payload.role === 'enseignant' && (!payload.departement || !payload.promotion)) {
        document.getElementById('editFormMessage').textContent = 'Département et promotions sont requis pour un enseignant.';
        return;
    }

    if (payload.role !== 'etudiant' && payload.promotion && !areValidPromotions(payload.promotion)) {
        document.getElementById('editFormMessage').textContent = 'Promotions invalides.';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/update`, {
            method: 'PUT',
            headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Erreur lors de la modification');

        closeEditModal();
        await loadUsers();
        await window.AdminUI.showMessage({ title: 'Succès', message: data.message || 'Utilisateur modifié avec succès.' });
    } catch (error) {
        document.getElementById('editFormMessage').textContent = error.message;
    }
}

function openResetModal(matricule) {
    document.getElementById('resetMatricule').value = matricule;
    document.getElementById('resetPassword').value = '';
    document.getElementById('resetConfirmPassword').value = '';
    document.getElementById('resetFormMessage').textContent = '';
    document.getElementById('passwordModal').style.display = 'flex';
}

function closeResetModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

async function saveResetPassword() {
    const matricule = document.getElementById('resetMatricule').value;
    const password = document.getElementById('resetPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;

    if (!password || password.length < 6) {
        document.getElementById('resetFormMessage').textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
        return;
    }

    if (password !== confirmPassword) {
        document.getElementById('resetFormMessage').textContent = 'Les mots de passe ne correspondent pas.';
        return;
    }

    let successMessage = 'Mot de passe réinitialisé.';
    const confirmed = await window.AdminUI.confirmAction({
        title: 'Réinitialiser le mot de passe',
        message: `Confirmer la réinitialisation du mot de passe pour ${matricule} ?`,
        confirmText: 'Réinitialiser',
        onConfirm: async () => {
            const response = await fetch(`${API_BASE}/users/reset-password`, {
                method: 'POST',
                headers: window.AdminUI.authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ matricule, password, confirmPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Réinitialisation impossible');
            successMessage = data.message || successMessage;
            closeResetModal();
        },
    });

    if (confirmed) {
        await window.AdminUI.showMessage({ title: 'Succès', message: successMessage });
    }
}

async function deleteSelectedUser(user) {
    let successMessage = 'Utilisateur supprimé.';
    const confirmed = await window.AdminUI.confirmAction({
        title: 'Supprimer l utilisateur',
        message: `Supprimer définitivement le compte ${user.matricule} ?`,
        confirmText: 'Supprimer',
        variant: 'danger',
        onConfirm: async () => {
            const response = await fetch(`${API_BASE}/users/${user.id}`, {
                method: 'DELETE',
                headers: window.AdminUI.authHeaders(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Suppression impossible');
            successMessage = data.message || successMessage;
            await loadUsers();
        },
    });

    if (confirmed) {
        await window.AdminUI.showMessage({ title: 'Succès', message: successMessage });
    }
}

function validateNewUser(payload) {
    if (!payload.nom || !payload.postnom || !payload.prenom || !payload.matricule) {
        return 'Nom, post-nom, prénom et matricule sont obligatoires.';
    }

    if (!payload.password || payload.password.length < 6) {
        return 'Le mot de passe doit contenir au moins 6 caractères.';
    }

    if (payload.password !== payload.confirmPassword) {
        return 'Les mots de passe ne correspondent pas.';
    }

    if (['admin', 'superadmin'].includes(payload.role) && currentUserRole !== 'superadmin') {
        return 'Seul le superadmin peut créer un compte administrateur.';
    }

    if (payload.role === 'etudiant' && (!payload.departement || !isValidPromotion(payload.promotion))) {
        return 'Département et promotion valide sont requis pour un étudiant.';
    }

    if (payload.role === 'enseignant' && (!payload.departement || !payload.promotion)) {
        return 'Département et promotions sont requis pour un enseignant.';
    }

    if (payload.role !== 'etudiant' && payload.promotion && !areValidPromotions(payload.promotion)) {
        return 'Promotions invalides.';
    }

    if (payload.role === 'admin' && !payload.departement) {
        return 'Service ou département requis pour un administrateur.';
    }

    return '';
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const filtered = allUsers.filter((user) => {
        const roleMatches = activeRoleFilter === 'tous'
            || (activeRoleFilter === 'professeur' && user.role === 'enseignant')
            || (activeRoleFilter === 'admin' && ['admin', 'superadmin'].includes(user.role))
            || user.role === activeRoleFilter;
        const text = `${user.matricule} ${user.email || ''} ${user.nom} ${user.post_nom} ${user.prenom} ${user.promotion || ''}`.toLowerCase();
        return roleMatches && (!search || text.includes(search));
    });
    displayUsers(filtered);
}

function filterUsers(role, button) {
    activeRoleFilter = role;
    document.querySelectorAll('.btn-filter').forEach((btn) => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    applyFilters();
}

function toggleFields() {
    const role = document.getElementById('roleSelector').value;
    document.getElementById('fieldsEtudiant').style.display = role === 'etudiant' ? 'grid' : 'none';
    document.getElementById('fieldsEnseignant').style.display = role === 'enseignant' ? 'grid' : 'none';
    document.getElementById('fieldsAdmin').style.display = role === 'admin' ? 'grid' : 'none';
}

document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'editRole') {
        const isStudent = event.target.value === 'etudiant';
        const editPromotion = document.getElementById('editPromotion');
        const currentValue = getPromotionValue('editPromotion', { multiple: editPromotion.multiple });
        editPromotion.multiple = !isStudent;
        setPromotionSelect('editPromotion', currentValue, !isStudent);
    }
});

function getDepartementForRole(role) {
    if (role === 'etudiant') return document.getElementById('etudiantDept').value.trim();
    if (role === 'enseignant') return document.getElementById('ensDept').value.trim();
    if (role === 'admin') return document.getElementById('adminDept').value.trim();
    return '';
}

function getRoleLabel(role) {
    const labels = {
        superadmin: 'Superadmin',
        admin: 'Administrateur',
        etudiant: 'Étudiant',
        enseignant: 'Professeur',
    };
    return labels[role] || role || '';
}

function setButtonLoading(id, loading, label = 'Traitement...') {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? 'Traitement...' : label;
}

function isValidPromotion(value) {
    return Boolean(window.PromotionOptions && window.PromotionOptions.isValid(value));
}

function areValidPromotions(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .every(isValidPromotion);
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

window.openUserModal = openUserModal;
window.closeEditModal = closeEditModal;
window.saveUserChanges = saveUserChanges;
window.filterUsers = filterUsers;
window.toggleFields = toggleFields;
