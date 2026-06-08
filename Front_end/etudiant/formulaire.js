document.addEventListener('DOMContentLoaded', () => {
    // --- 1. MODALE DE DÉCONNEXION ---
    const logoutTrigger = document.querySelector('.btn-logout'); // Assure-toi que ton lien a cette classe
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');

    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });
    }

    if (btnCancelLogout) {
        btnCancelLogout.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === logoutModal) logoutModal.style.display = 'none';
    });

    // --- 2. GESTION DES COURS ---
    const container = document.getElementById('coursesContainer');
    const addBtn = document.getElementById('addCourseBtn');
    let courseIds = [1]; 

    const getNextId = () => {
        for (let i = 1; i <= 4; i++) {
            if (!courseIds.includes(i)) return i;
        }
        return null;
    };

    addBtn.addEventListener('click', () => {
        const id = getNextId();
        if (id !== null) {
            courseIds.push(id);
            const newBlock = document.createElement('div');
            newBlock.className = 'course-block';
            newBlock.id = `block-${id}`;
            newBlock.innerHTML = `
                <h4 class="block-title"><i class="fa-solid fa-book"></i> Cours ${id}</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Cours</label>
                        <select class="course-select"><option value="ECO-312">ECO-312</option><option value="INFO-315">INFO-315</option></select>
                    </div>
                    <div class="form-group">
                        <label>Type d'évaluation</label>
                        <div class="eval-checkboxes">
                            <label><input type="checkbox" value="TP"> TP</label><label><input type="checkbox" value="TD"> TD</label><label><input type="checkbox" value="Interro"> Interro</label><label><input type="checkbox" value="Examen"> Examen</label>
                        </div>
                    </div>
                </div>
                <div class="form-group"><label>Justification</label><textarea class="details-input" rows="3" required></textarea></div>
                <div class="form-group">
                    <label>Preuve</label>
                    <div class="file-drop-zone" onclick="this.querySelector('input').click()">
                        <i class="fa-solid fa-cloud-arrow-up"></i><input type="file" class="file-input" hidden>
                        <span class="file-label-text">Choisir un fichier (PDF/Image, max 5Mo)</span>
                    </div>
                </div>
                <button type="button" class="btn-remove" onclick="confirmDelete(${id})">Supprimer</button>
            `;
            container.appendChild(newBlock);
            if (courseIds.length === 4) addBtn.style.display = 'none';
        }
    });

    window.confirmDelete = (id) => {
        if (confirm("Supprimer ce cours ?")) {
            document.getElementById(`block-${id}`).remove();
            courseIds = courseIds.filter(item => item !== id);
            document.getElementById('addCourseBtn').style.display = 'block';
        }
    };
});

// --- 3. GESTION FICHIERS ---
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('file-input')) {
        const span = e.target.closest('.file-drop-zone').querySelector('.file-label-text');
        span.textContent = e.target.files[0] ? e.target.files[0].name : "Choisir un fichier";
    }
});