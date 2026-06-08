document.addEventListener('DOMContentLoaded', () => {
    const userModal = document.getElementById('userModal');
    
    window.openUserModal = () => { userModal.style.display = 'flex'; };
    
    document.getElementById('btnCancelUser').addEventListener('click', () => {
        userModal.style.display = 'none';
    });

    document.getElementById('btnSaveUser').addEventListener('click', () => {
        const role = document.getElementById('roleSelector').value;
        const data = {
            nom: document.getElementById('nom').value,
            postnom: document.getElementById('postnom').value,
            prenom: document.getElementById('prenom').value,
            matricule: document.getElementById('matricule').value,
            role: role
        };

        if (role === 'etudiant') {
            data.dept = document.getElementById('etudiantDept').value;
            data.promo = document.getElementById('etudiantPromo').value;
        } else {
            data.cours = document.getElementById('ensCours').value;
            data.promos = document.getElementById('ensPromos').value;
            data.depts = document.getElementById('ensDept').value;
            data.credits = document.getElementById('ensCredits').value;
        }

        if(!data.nom || !data.matricule) return alert("Nom et Matricule obligatoires !");
        
        console.log("Données sauvegardées :", data);
        alert("Utilisateur ajouté avec succès !");
        userModal.style.display = 'none';
    });
});

function toggleFields() {
    const role = document.getElementById('roleSelector').value;
    document.getElementById('fieldsEtudiant').style.display = (role === 'etudiant') ? 'grid' : 'none';
    document.getElementById('fieldsEnseignant').style.display = (role === 'enseignant') ? 'grid' : 'none';
}
// 1. Logique pour filtrer les utilisateurs
function filterUsers(role) {
    const rows = document.querySelectorAll('#user-body tr');
    
    // Mettre à jour l'apparence des boutons de filtre
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    rows.forEach(row => {
        const userRole = row.querySelector('.status').textContent.toLowerCase();
        
        if (role === 'tous') {
            row.style.display = '';
        } else if (userRole.includes(role)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 2. Logique pour réinitialiser le mot de passe
function resetPassword(matricule) {
    if(confirm(`Voulez-vous vraiment réinitialiser le mot de passe de l'utilisateur ${matricule} ?`)) {
        // Ici, tu appelleras ton backend plus tard
        console.log(`Mot de passe réinitialisé par défaut (ULPGL2026) pour : ${matricule}`);
        alert(`Le mot de passe pour le matricule ${matricule} a été réinitialisé à : ULPGL2026`);
    }
}