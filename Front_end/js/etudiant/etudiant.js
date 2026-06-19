const API_ORIGIN = window.location.port === "3001" ? window.location.origin : "http://localhost:3001";
const API_BASE = `${API_ORIGIN}/api/etudiant`;
const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const VALID_PROMOTIONS = ["LICENCE 1", "LICENCE 2", "LICENCE 3", "MASTER 1", "MASTER 2"];

function normalizePromotion(value) {
    const aliases = {
        L1: "LICENCE 1",
        LICENCE1: "LICENCE 1",
        "LICENCE 1": "LICENCE 1",
        L2: "LICENCE 2",
        LICENCE2: "LICENCE 2",
        "LICENCE 2": "LICENCE 2",
        L3: "LICENCE 3",
        LICENCE3: "LICENCE 3",
        "LICENCE 3": "LICENCE 3",
        M1: "MASTER 1",
        MASTER1: "MASTER 1",
        "MASTER 1": "MASTER 1",
        M2: "MASTER 2",
        MASTER2: "MASTER 2",
        "MASTER 2": "MASTER 2",
    };
    const key = String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
    return aliases[key] || aliases[key.replace(/\s/g, "")] || key;
}

window.addEventListener("DOMContentLoaded", () => {
    const addEtudiantForm = document.getElementById("addEtudiantForm");
    if (!addEtudiantForm) return;
    const promotionField = document.getElementById("etudiantPromo");

    if (promotionField && promotionField.tagName === "SELECT" && promotionField.options.length === 0) {
        promotionField.innerHTML = [
            '<option value="">Choisir une promotion...</option>',
            ...VALID_PROMOTIONS.map((promotion) => `<option value="${promotion}">${promotion}</option>`),
        ].join("");
    }

    addEtudiantForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nom = document.getElementById("nom").value.trim();
        const postnom = document.getElementById("postnom").value.trim();
        const prenom = document.getElementById("prenom").value.trim();
        const matricule = document.getElementById("matricule").value.trim();
        const departement = document.getElementById("etudiantDept").value.trim();
        const promotion = normalizePromotion(document.getElementById("etudiantPromo").value);

        if (!nom || !postnom || !prenom || !matricule || !departement || !promotion) {
            alert("Tous les champs sont requis !");
            return;
        }

        if (!VALID_PROMOTIONS.includes(promotion)) {
            alert("Promotion invalide. Choisissez LICENCE 1, LICENCE 2, LICENCE 3, MASTER 1 ou MASTER 2.");
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
