const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
const API_BASE = `${API_ORIGIN}/api/etudiant`;
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

window.addEventListener("DOMContentLoaded", () => {
    const addEtudiantForm = document.getElementById("addEtudiantForm");
    if (!addEtudiantForm) return;

    addEtudiantForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nom = document.getElementById("nom").value.trim();
        const postnom = document.getElementById("postnom").value.trim();
        const prenom = document.getElementById("prenom").value.trim();
        const matricule = document.getElementById("matricule").value.trim();
        const departement = document.getElementById("etudiantDept").value.trim();
        const promotion = document.getElementById("etudiantPromo").value.trim();

        if (!nom || !postnom || !prenom || !matricule || !departement || !promotion) {
            alert("Tous les champs sont requis !");
            return;
        }

        if (!token) {
            alert("Aucun token d'authentification trouvé. Veuillez vous reconnecter.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ nom, postnom, prenom, matricule, departement, promotion })
            });
            const data = await response.json();

            if (response.ok) {
                alert(data.message || "Étudiant ajouté avec succès !");
                addEtudiantForm.reset();
            } else {
                alert(data.message || "Erreur lors de l'ajout de l'étudiant");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'ajout de l'étudiant");
        }
    });

async function getAllEtudiants() {

    if (!token) {
        alert("Veuillez vous reconnecter.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/all`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            // Handle the list of students
        } else {
            alert(data.message || "Erreur lors de la récupération des étudiants");
        }
    } catch (error) {
        console.error(error);
        alert("Erreur lors de la récupération des étudiants");
    }
}
});
