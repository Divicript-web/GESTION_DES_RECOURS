document.addEventListener('DOMContentLoaded', () => {
    // Gestion Modale Déconnexion
    const logoutModal = document.getElementById('logoutModal');
    document.getElementById('logoutTrigger').addEventListener('click', () => logoutModal.style.display = 'flex');
    document.getElementById('btnCancelLogout').addEventListener('click', () => logoutModal.style.display = 'none');

    // Gestion Modale Assignation
    const assignModal = document.getElementById('assignModal');
    const btnCancelAssign = document.getElementById('btnCancelAssign');
    let currentRecoursId = null;

    window.openAssignModal = (id) => {
        currentRecoursId = id;
        assignModal.style.display = 'flex';
    };

    btnCancelAssign.addEventListener('click', () => assignModal.style.display = 'none');

    document.querySelector('.btn-modal-confirm').addEventListener('click', () => {
        const prof = document.getElementById('profSelect').value;
        if (prof.includes("Sélectionner")) return alert("Veuillez choisir un enseignant.");
        console.log(`Recours ${currentRecoursId} assigné à ${prof}`);
        assignModal.style.display = 'none';
        alert("Assignation réussie.");
    });

    // Fermeture en cliquant sur le fond noir
    window.addEventListener('click', (e) => {
        if (e.target === assignModal) assignModal.style.display = 'none';
        if (e.target === logoutModal) logoutModal.style.display = 'none';
    });
});