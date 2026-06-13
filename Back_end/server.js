const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || 'CLE_SECRETE_ULPGL_2026';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'ULPGL2026';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || DEFAULT_PASSWORD;
const FRONTEND_DIR = path.join(__dirname, '..', 'Front_end');
const configuredUploadDir = process.env.UPLOAD_DIR || './uploads/recours';
const UPLOAD_DIR = path.isAbsolute(configuredUploadDir)
    ? configuredUploadDir
    : path.join(__dirname, configuredUploadDir);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniquePrefix}-${safeName}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 4,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Format de fichier non autorise. Utilisez PDF, JPG ou PNG.'));
        }
        cb(null, true);
    },
});

function uploadRecoursFiles(req, res, next) {
    upload.any()(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Fichier invalide' });
        }

        next();
    });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let demoUsers = [
    {
        id: 1,
        matricule: 'superadmin',
        nom: 'Super',
        post_nom: 'Administrateur',
        prenom: 'ULPGL',
        role: 'superadmin',
        departement: 'Administration',
        promotion: '',
        password_hash: bcrypt.hashSync(SUPERADMIN_PASSWORD, 10),
    },
    {
        id: 2,
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
        id: 3,
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
        id: 4,
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

const VALID_ROLES = ['etudiant', 'enseignant', 'admin', 'superadmin'];

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
    const password = String(payload.password || DEFAULT_PASSWORD);
    const passwordHash = await bcrypt.hash(password, 10);

    if (!matricule || !nom || !post_nom || !prenom) {
        const error = new Error('Matricule, nom, post-nom et prenom sont obligatoires');
        error.status = 400;
        throw error;
    }

    if (!VALID_ROLES.includes(role)) {
        const error = new Error('Role invalide');
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

async function changePassword(userId, currentPassword, newPassword) {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
        const error = new Error('Utilisateur introuvable');
        error.status = 404;
        throw error;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
        const error = new Error('Mot de passe actuel incorrect');
        error.status = 400;
        throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
    );
}

async function listRecoursByUser(userId) {
    const result = await db.query(
        `SELECT id, course_code, course_title, evaluation_types, justification, proof_name, proof_path, status, created_at
         FROM recours
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC`,
        [userId]
    );

    return result.rows.map((recours) => ({
        ...recours,
        evaluation_types: JSON.parse(recours.evaluation_types || '[]'),
    }));
}

async function listAllRecours() {
    const result = await db.query(
        `SELECT r.id, r.course_code, r.course_title, r.evaluation_types, r.justification,
                r.proof_name, r.proof_path, r.status, r.created_at,
                u.matricule, u.nom, u.post_nom, u.prenom, u.departement, u.promotion
         FROM recours r
         JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC, r.id DESC`
    );

    return result.rows.map((recours) => ({
        ...recours,
        evaluation_types: JSON.parse(recours.evaluation_types || '[]'),
    }));
}

async function createRecours(userId, payload) {
    const courseCode = String(payload.courseCode || '').trim();
    const courseTitle = String(payload.courseTitle || '').trim();
    const evaluationTypes = Array.isArray(payload.evaluationTypes) ? payload.evaluationTypes : [];
    const justification = String(payload.justification || '').trim();
    const proofName = String(payload.proofName || '').trim();
    const proofPath = String(payload.proofPath || '').trim();

    if (!courseCode || !courseTitle || evaluationTypes.length === 0 || !justification) {
        const error = new Error('Cours, evaluation et justification sont obligatoires');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `INSERT INTO recours (user_id, course_code, course_title, evaluation_types, justification, proof_name, proof_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, course_code, course_title, evaluation_types, justification, proof_name, proof_path, status, created_at`,
        [userId, courseCode, courseTitle, JSON.stringify(evaluationTypes), justification, proofName || null, proofPath || null]
    );

    const recours = result.rows[0];
    return {
        ...recours,
        evaluation_types: JSON.parse(recours.evaluation_types || '[]'),
    };
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

async function ensureSuperAdmin() {
    if (!(await databaseReady())) return;

    const existing = await db.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['superadmin']);
    if (existing.rows.length > 0) return;

    await createUser({
        matricule: 'superadmin',
        nom: 'Super',
        post_nom: 'Administrateur',
        prenom: 'ULPGL',
        role: 'superadmin',
        departement: 'Administration',
        password: SUPERADMIN_PASSWORD,
    });
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

function requireRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Acces reserve' });
        }

        next();
    };
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

app.post('/register', async (req, res) => {
    try {
        const password = String(req.body.password || '');
        const confirmPassword = String(req.body.confirmPassword || '');

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caracteres' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
        }

        const user = await createUser({
            ...req.body,
            role: 'etudiant',
            password,
        });

        res.status(201).json({
            message: 'Compte etudiant cree avec succes',
            user,
        });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de l inscription' });
    }
});

// 3. Route pour récupérer les infos du profil (exemple protégé)
app.get('/profile', authenticateToken, async (req, res) => {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(publicUser(user));
});

app.put('/profile/password', authenticateToken, async (req, res) => {
    try {
        const currentPassword = String(req.body.currentPassword || '');
        const newPassword = String(req.body.newPassword || '');
        const confirmPassword = String(req.body.confirmPassword || '');

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Tous les champs sont requis' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caracteres' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
        }

        await changePassword(req.user.id, currentPassword, newPassword);
        res.json({ message: 'Mot de passe modifie avec succes' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la modification du mot de passe' });
    }
});

app.get('/api/etudiant/all', authenticateToken, async (req, res) => {
    const users = await listUsers();
    res.json({ etudiants: users.filter(user => user.role === 'etudiant') });
});

app.post('/api/etudiant/add', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const requestedRole = req.body.role || 'etudiant';

        if (['admin', 'superadmin'].includes(requestedRole) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Seul le superadmin peut creer un compte administrateur' });
        }

        const user = await createUser({ ...req.body, role: requestedRole });
        res.status(201).json({ message: 'Utilisateur ajoute avec succes', user });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la creation' });
    }
});

app.get('/api/etudiant/users/all', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    const users = await listUsers();
    res.json({ users });
});

app.put('/api/etudiant/users/update', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        if (['admin', 'superadmin'].includes(req.body.role) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Seul le superadmin peut attribuer un role administrateur' });
        }

        const user = await updateUser(req.body);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        res.json({ message: 'Utilisateur modifie avec succes', user });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la modification' });
    }
});

app.post('/api/etudiant/users/reset-password', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    const done = await resetPassword(req.body.matricule);
    if (!done) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: `Mot de passe reinitialise a : ${DEFAULT_PASSWORD}` });
});

app.get('/api/admin/recours', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const recours = await listAllRecours();
        res.json({ recours });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des recours' });
    }
});

app.get('/api/recours/me', authenticateToken, async (req, res) => {
    try {
        const recours = await listRecoursByUser(req.user.id);
        res.json({ recours });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des recours' });
    }
});

app.post('/api/recours', authenticateToken, uploadRecoursFiles, async (req, res) => {
    try {
        const courses = parseCoursesPayload(req.body.courses);
        const filesByField = new Map((req.files || []).map((file) => [file.fieldname, file]));

        if (courses.length === 0) {
            return res.status(400).json({ message: 'Aucun cours a soumettre' });
        }

        const created = [];
        for (const [index, course] of courses.entries()) {
            const file = filesByField.get(`proof_${index}`);
            created.push(await createRecours(req.user.id, {
                ...course,
                proofName: file ? file.originalname : course.proofName,
                proofPath: file ? `/uploads/recours/${file.filename}` : '',
            }));
        }

        res.status(201).json({
            message: 'Recours soumis avec succes',
            recours: created,
        });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la soumission du recours' });
    }
});

function parseCoursesPayload(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// --- LANCEMENT ---
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';

seedDefaultUsers()
    .then(() => ensureSuperAdmin())
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
