document.addEventListener('DOMContentLoaded', () => {
    const coursModal = document.getElementById('coursModal');
    const btnCancelCours = document.getElementById('btnCancelCours');
    const btnSaveCours = document.getElementById('btnSaveCours');

    // Fonction pour ouvrir la modale
    window.openCoursModal = () => {
        coursModal.style.display = 'flex';
    };

    // Fermeture manuelle
    btnCancelCours.addEventListener('click', () => {
        coursModal.style.display = 'none';
    });

    // Sauvegarde des données
    // Remplace ton bloc btnSaveCours par celui-ci :
btnSaveCours.addEventListener('click', () => {
    const coursData = {
        code: document.getElementById('codeCours').value,
        nom: document.getElementById('nomCours').value,
        credits: document.getElementById('creditsCours').value,
        dept: document.getElementById('deptCours').value,
        enseignant: document.getElementById('ensResponsable').value,
        promos: document.getElementById('promosCours').value
    };

    // CORRECTION ICI : Ajout du 'if'
    if (!coursData.code || !coursData.nom) {
        return alert("Le code et le nom du cours sont obligatoires !");
    }

    console.log("Données du cours complet :", coursData);
    alert("Cours ajouté : " + coursData.nom + " (Resp: " + coursData.enseignant + ")");
    
    coursModal.style.display = 'none';
});

    // Clic extérieur pour fermer
    window.addEventListener('click', (e) => {
        if(e.target === coursModal) {
            coursModal.style.display = 'none';
        }
    });
});