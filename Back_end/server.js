const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || 'CLE_SECRETE_ULPGL_2026';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'ULPGL2026';
const FRONTEND_DIR = path.join(__dirname, '..', 'Front_end');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

let demoUsers = [
    {
        id: 1,
        matricule: 'admin',
        nom: 'Administrateur',
        post_nom: 'Systeme',
        prenom: 'ULPGL',
        role: 'admin',
        departement: 'Administration',
        promotion: '',
        password_hash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    },
    {
        id: 2,
        matricule: 'ETU001',
        nom: 'Mabika',
        post_nom: 'Kambale',
        prenom: 'Divin',
        role: 'etudiant',
        departement: 'Sciences Economiques',
        promotion: 'L2',
        password_hash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    },
    {
        id: 3,
        matricule: 'PROF001',
        nom: 'Kasereka',
        post_nom: 'Munyanga',
        prenom: 'Grace',
        role: 'enseignant',
        departement: 'Gestion',
        promotion: '',
        password_hash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    },
];

function publicUser(user) {
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
}

async function databaseReady() {
    return db.isAvailable();
}

async function findUserByMatricule(matricule) {
    if (await databaseReady()) {
        const result = await db.query('SELECT * FROM users WHERE matricule = $1', [matricule]);
        return result.rows[0] || null;
    }

    return demoUsers.find(user => user.matricule.toLowerCase() === String(matricule).toLowerCase()) || null;
}

async function findUserById(id) {
    if (await databaseReady()) {
        const result = await db.query('SELECT id, matricule, nom, post_nom, prenom, role, departement, promotion FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    return demoUsers.find(user => user.id === Number(id)) || null;
}

async function listUsers() {
    if (await databaseReady()) {
        const result = await db.query('SELECT id, matricule, nom, post_nom, prenom, role, departement, promotion FROM users ORDER BY id DESC');
        return result.rows;
    }

    return demoUsers.map(publicUser);
}

async function createUser(payload) {
    const matricule = String(payload.matricule || '').trim();
    const nom = String(payload.nom || '').trim();
    const post_nom = String(payload.post_nom || payload.postnom || '').trim();
    const prenom = String(payload.prenom || '').trim();
    const role = payload.role || 'etudiant';
    const departement = String(payload.departement || '').trim();
    const promotion = String(payload.promotion || '').trim();
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    if (!matricule || !nom || !post_nom || !prenom) {
        const error = new Error('Matricule, nom, post-nom et prenom sont obligatoires');
        error.status = 400;
        throw error;
    }

    if (await findUserByMatricule(matricule)) {
        const error = new Error('Ce matricule existe deja');
        error.status = 409;
        throw error;
    }

    if (await databaseReady()) {
        const result = await db.query(
            `INSERT INTO users (matricule, nom, post_nom, prenom, role, departement, promotion, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, matricule, nom, post_nom, prenom, role, departement, promotion`,
            [matricule, nom, post_nom, prenom, role, departement, promotion, passwordHash]
        );
        return result.rows[0];
    }

    const user = {
        id: Math.max(...demoUsers.map(item => item.id), 0) + 1,
        matricule,
        nom,
        post_nom,
        prenom,
        role,
        departement,
        promotion,
        password_hash: passwordHash,
    };
    demoUsers.push(user);
    return publicUser(user);
}

async function updateUser(payload) {
    const id = Number(payload.id);
    const matricule = String(payload.matricule || '').trim();
    const nom = String(payload.nom || '').trim();
    const post_nom = String(payload.post_nom || '').trim();
    const prenom = String(payload.prenom || '').trim();
    const role = String(payload.role || 'etudiant').trim();

    if (!id || !matricule || !nom || !post_nom || !prenom || !role) {
        const error = new Error('Tous les champs sont requis');
        error.status = 400;
        throw error;
    }

    if (await databaseReady()) {
        const result = await db.query(
            `UPDATE users
             SET matricule = $1, nom = $2, post_nom = $3, prenom = $4, role = $5
             WHERE id = $6
             RETURNING id, matricule, nom, post_nom, prenom, role, departement, promotion`,
            [matricule, nom, post_nom, prenom, role, id]
        );
        return result.rows[0] || null;
    }

    const index = demoUsers.findIndex(user => user.id === id);
    if (index === -1) return null;

    demoUsers[index] = { ...demoUsers[index], matricule, nom, post_nom, prenom, role };
    return publicUser(demoUsers[index]);
}

async function resetPassword(matricule) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    if (await databaseReady()) {
        const result = await db.query(
            'UPDATE users SET password_hash = $1 WHERE matricule = $2 RETURNING id',
            [passwordHash, matricule]
        );
        return result.rowCount > 0;
    }

    const user = await findUserByMatricule(matricule);
    if (!user) return false;
    user.password_hash = passwordHash;
    return true;
}

async function seedDefaultUsers() {
    if (!(await databaseReady())) return;

    const users = await listUsers();
    if (users.length > 0) return;

    for (const user of demoUsers) {
        await db.query(
            `INSERT INTO users (matricule, nom, post_nom, prenom, role, departement, promotion, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                user.matricule,
                user.nom,
                user.post_nom,
                user.prenom,
                user.role,
                user.departement,
                user.promotion,
                user.password_hash,
            ]
        );
    }
}

function authenticateToken(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(403).json({ message: 'Acces refuse' });
    }

    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token invalide' });
    }
}

// --- ROUTES ---

// 1. Route de Test de connexion
app.get('/test', (req, res) => {
    res.json({ message: "Serveur actif !" });
});

app.get('/health', async (req, res) => {
    const dbAvailable = await databaseReady();
    res.json({
        status: 'ok',
        database: dbAvailable ? 'sqlite' : 'demo-memory',
        databasePath: db.databasePath || null,
    });
});

// 2. Route de Connexion (Login)
app.post('/login', async (req, res) => {
    const { matricule, password } = req.body;

    try {
        const user = await findUserByMatricule(matricule);

        if (!user) {
            return res.status(401).json({ message: 'Matricule inconnu' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Mot de passe incorrect' });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { id: user.id, matricule: user.matricule, role: user.role }, 
            SECRET_KEY, 
            { expiresIn: '1h' }
        );

        // Envoyer la réponse avec le token et le rôle
        res.json({ 
            message: 'Connexion réussie', 
            token, 
            role: user.role,
            user: publicUser(user),
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// 3. Route pour récupérer les infos du profil (exemple protégé)
app.get('/profile', authenticateToken, async (req, res) => {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(publicUser(user));
});

app.get('/api/etudiant/all', authenticateToken, async (req, res) => {
    const users = await listUsers();
    res.json({ etudiants: users.filter(user => user.role === 'etudiant') });
});

app.post('/api/etudiant/add', authenticateToken, async (req, res) => {
    try {
        const user = await createUser({ ...req.body, role: req.body.role || 'etudiant' });
        res.status(201).json({ message: 'Etudiant ajoute avec succes', user });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la creation' });
    }
});

app.get('/api/etudiant/users/all', authenticateToken, async (req, res) => {
    const users = await listUsers();
    res.json({ users });
});

app.put('/api/etudiant/users/update', authenticateToken, async (req, res) => {
    try {
        const user = await updateUser(req.body);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        res.json({ message: 'Utilisateur modifie avec succes', user });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la modification' });
    }
});

app.post('/api/etudiant/users/reset-password', authenticateToken, async (req, res) => {
    const done = await resetPassword(req.body.matricule);
    if (!done) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: `Mot de passe reinitialise a : ${DEFAULT_PASSWORD}` });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// --- LANCEMENT ---
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';

seedDefaultUsers()
    .then(() => {
        app.listen(PORT, HOST, (err) => {
            if (err) {
                console.error(`Impossible de lancer le serveur sur ${HOST}:${PORT}`, err);
                process.exit(1);
            }

            console.log(`Serveur opérationnel sur http://${HOST}:${PORT}`);
            console.log(`Base SQLite : ${db.databasePath}`);
        });
    })
    .catch((err) => {
        console.error('Impossible d initialiser la base SQLite', err);
        process.exit(1);
    });
