const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
const API_BASE = `${API_ORIGIN}/api/etudiant`;
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

let allUsers = []; // Stockage des utilisateurs
let currentUserRole = null;

async function loadAdminProfile() {
    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    const response = await fetch(`${API_ORIGIN}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        window.location.href = "../login.html";
        return;
    }

    const user = await response.json();
    currentUserRole = user.role;
    document.getElementById("adminName").textContent = user.role === "superadmin" ? "Superadmin" : "Admin";
    configureRoleControls();
}

function configureRoleControls() {
    const adminOptions = document.querySelectorAll('[data-superadmin-only], #editRole option[value="admin"], #editRole option[value="superadmin"]');
    adminOptions.forEach((option) => {
        option.hidden = currentUserRole !== "superadmin";
        option.disabled = currentUserRole !== "superadmin";
    });
}

// Charger les utilisateurs au démarrage
async function loadUsers() {
    if (!token) {
        alert("Aucun token d'authentification trouvé. Veuillez vous reconnecter.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/all`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Erreur lors du chargement des utilisateurs");
        }

        const data = await response.json();
        allUsers = data.users || [];
        displayUsers(allUsers);
    } catch (error) {
        console.error(error);
        alert("Erreur lors du chargement des utilisateurs");
    }
}

// Échappe les valeurs pour les attributs onclick
function escapeQuotes(value) {
    return String(value || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Afficher les utilisateurs dans le tableau
function displayUsers(users) {
    const userBody = document.getElementById("user-body");
    userBody.innerHTML = "";

    if (!users || users.length === 0) {
        userBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Aucun utilisateur trouvé</td></tr>`;
        return;
    }

    users.forEach(user => {
        const roleBadge = getRoleLabel(user.role);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${user.matricule || ""}</td>
            <td>${user.nom || ""}</td>
            <td>${user.post_nom || ""}</td>
            <td>${user.prenom || ""}</td>
            <td>${roleBadge}</td>
            <td><button type="button" class="btn-action-sm" onclick="openEditModal(${user.id}, '${escapeQuotes(user.matricule)}', '${escapeQuotes(user.nom)}', '${escapeQuotes(user.post_nom)}', '${escapeQuotes(user.prenom)}', '${escapeQuotes(user.role)}')">Modifier</button></td>
            <td>
                <button type="button" class="btn-reset" onclick="confirmResetPassword('${escapeQuotes(user.matricule)}')">
                    <i class="fa-solid fa-key"></i> Reset
                </button>
            </td>
        `;
        userBody.appendChild(row);
    });
}

// Ouvrir le modal d'édition
function openEditModal(id, matricule, nom, postnom, prenom, role) {
    document.getElementById("editUserId").value = id;
    document.getElementById("editMatricule").value = matricule;
    document.getElementById("editNom").value = nom;
    document.getElementById("editPostnom").value = postnom;
    document.getElementById("editPrenom").value = prenom;
    document.getElementById("editRole").value = role || "etudiant";
    configureRoleControls();
    document.getElementById("editModal").style.display = "flex";
}

// Fermer le modal d'édition
function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

// Enregistrer les modifications
async function saveUserChanges() {
    const id = document.getElementById("editUserId").value;
    const matricule = document.getElementById("editMatricule").value.trim();
    const nom = document.getElementById("editNom").value.trim();
    const post_nom = document.getElementById("editPostnom").value.trim();
    const prenom = document.getElementById("editPrenom").value.trim();
    const role = document.getElementById("editRole").value;

    if (["admin", "superadmin"].includes(role) && currentUserRole !== "superadmin") {
        alert("Seul le superadmin peut attribuer un rôle administrateur.");
        return;
    }

    if (!matricule || !nom || !post_nom || !prenom || !role) {
        alert("Tous les champs sont requis !");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/update`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ id: parseInt(id), matricule, nom, post_nom, prenom, role })
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la modification");
        }

        alert("Utilisateur modifié avec succès !");
        closeEditModal();
        loadUsers();
    } catch (error) {
        console.error(error);
        alert("Erreur lors de la modification de l'utilisateur");
    }
}

// Réinitialiser le mot de passe
async function confirmResetPassword(matricule) {
    if (confirm(`Réinitialiser le mot de passe de ${matricule} ?`)) {
        try {
            const response = await fetch(`${API_BASE}/users/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ matricule })
            });

            if (!response.ok) {
                throw new Error("Erreur lors de la réinitialisation");
            }

            const data = await response.json();
            alert(data.message || `Mot de passe réinitialisé à : ULPGL2026`);
            loadUsers();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la réinitialisation du mot de passe");
        }
    }
}

// Rechercher par matricule
function searchByMatricule() {
    const searchInput = document.getElementById("searchInput").value.trim();

    if (!searchInput) {
        displayUsers(allUsers);
        return;
    }

    const filtered = allUsers.filter(user => 
        user.matricule.toLowerCase().includes(searchInput.toLowerCase()) ||
        `${user.nom} ${user.post_nom} ${user.prenom}`.toLowerCase().includes(searchInput.toLowerCase())
    );

    displayUsers(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    const userModal = document.getElementById('userModal');

    window.openUserModal = () => {
        document.getElementById('roleSelector').value = 'etudiant';
        toggleFields();
        document.getElementById('nom').value = '';
        document.getElementById('postnom').value = '';
        document.getElementById('prenom').value = '';
        document.getElementById('matricule').value = '';
        document.getElementById('etudiantDept').value = '';
        document.getElementById('etudiantPromo').value = '';
        document.getElementById('ensDept').value = '';
        document.getElementById('adminDept').value = '';
        document.getElementById('fieldsEtudiant').style.display = 'grid';
        document.getElementById('fieldsEnseignant').style.display = 'none';
        document.getElementById('fieldsAdmin').style.display = 'none';
        configureRoleControls();
        userModal.style.display = 'flex';
    };

    document.getElementById('btnCancelUser').addEventListener('click', () => {
        userModal.style.display = 'none';
    });

    document.getElementById('roleSelector').addEventListener('change', toggleFields);

    document.getElementById('btnSaveUser').addEventListener('click', async () => {
        const role = document.getElementById('roleSelector').value;
        const nom = document.getElementById('nom').value.trim();
        const postnom = document.getElementById('postnom').value.trim();
        const prenom = document.getElementById('prenom').value.trim();
        const matricule = document.getElementById('matricule').value.trim();

        if (!nom || !postnom || !prenom || !matricule) {
            return alert("Nom, Post-nom, Prénom et Matricule sont obligatoires !");
        }

        if (["admin", "superadmin"].includes(role) && currentUserRole !== "superadmin") {
            return alert("Seul le superadmin peut créer un compte administrateur.");
        }

        const departement = getDepartementForRole(role);
        const promotion = role === 'etudiant'
            ? document.getElementById('etudiantPromo').value.trim()
            : document.getElementById('ensPromos').value.trim();

        if (role === 'etudiant' && (!departement || !promotion)) {
            return alert("Département et Promotion sont requis pour un étudiant.");
        }

        if (role === 'enseignant' && !departement) {
            return alert("Département requis pour un enseignant.");
        }

        if (role === 'admin' && !departement) {
            return alert("Service ou département requis pour un administrateur.");
        }

        if (!token) {
            return alert("Aucun token d'authentification trouvé. Veuillez vous reconnecter.");
        }

        try {
            const response = await fetch(`${API_BASE}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nom, postnom, prenom, matricule, departement, promotion, role })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || "Étudiant ajouté avec succès !");
                userModal.style.display = 'none';
                loadUsers();
            } else {
                alert(data.message || "Erreur lors de l'ajout de l'étudiant");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'ajout de l'étudiant");
        }
    });

    // Événement pour la recherche
    const searchBtn = document.getElementById('searchButton');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchByMatricule);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                searchByMatricule();
            }
        });
    }

    // Charger les utilisateurs au démarrage
    loadAdminProfile().then(loadUsers).catch((error) => {
        console.error(error);
        alert("Impossible de charger le profil administrateur.");
    });
});

function toggleFields() {
    const role = document.getElementById('roleSelector').value;
    document.getElementById('fieldsEtudiant').style.display = (role === 'etudiant') ? 'grid' : 'none';
    document.getElementById('fieldsEnseignant').style.display = (role === 'enseignant') ? 'grid' : 'none';
    document.getElementById('fieldsAdmin').style.display = (role === 'admin') ? 'grid' : 'none';
}

// Logique pour filtrer les utilisateurs
function filterUsers(role, button) {
    const filtered = allUsers.filter(user => {
        if (role === 'tous') return true;
        if (role === 'etudiant') return user.role === 'etudiant';
        if (role === 'professeur') return user.role === 'enseignant';
        if (role === 'admin') return user.role === 'admin' || user.role === 'superadmin';
        return false;
    });

    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if (button) {
        button.classList.add('active');
    }

    displayUsers(filtered);
}

function getDepartementForRole(role) {
    if (role === 'etudiant') return document.getElementById('etudiantDept').value.trim();
    if (role === 'enseignant') return document.getElementById('ensDept').value.trim();
    if (role === 'admin') return document.getElementById('adminDept').value.trim();
    return '';
}

function getRoleLabel(role) {
    const labels = {
        superadmin: "Superadmin",
        admin: "Administrateur",
        etudiant: "Étudiant",
        enseignant: "Professeur",
    };

    return labels[role] || role || "";
}
