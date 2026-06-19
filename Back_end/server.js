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
        const allowedMimeTypes = new Set([
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/csv',
            'text/plain',
        ]);
        const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt']);
        const extension = path.extname(file.originalname).toLowerCase();
        const hasReliableMimeType = file.mimetype && file.mimetype !== 'application/octet-stream';

        if (!allowedExtensions.has(extension) || (hasReliableMimeType && !allowedMimeTypes.has(file.mimetype))) {
            return cb(new Error('Format de fichier non autorise. Utilisez PDF, image, Word, Excel, CSV ou TXT.'));
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
app.use('/uploads/recours', express.static(UPLOAD_DIR));
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
        promotion: 'LICENCE 2',
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
const VALID_PROMOTIONS = ['LICENCE 1', 'LICENCE 2', 'LICENCE 3', 'MASTER 1', 'MASTER 2'];
const PROMOTION_ALIASES = {
    L1: 'LICENCE 1',
    'L 1': 'LICENCE 1',
    LICENCE1: 'LICENCE 1',
    'LICENCE 1': 'LICENCE 1',
    L2: 'LICENCE 2',
    'L 2': 'LICENCE 2',
    LICENCE2: 'LICENCE 2',
    'LICENCE 2': 'LICENCE 2',
    L3: 'LICENCE 3',
    'L 3': 'LICENCE 3',
    LICENCE3: 'LICENCE 3',
    'LICENCE 3': 'LICENCE 3',
    M1: 'MASTER 1',
    'M 1': 'MASTER 1',
    MASTER1: 'MASTER 1',
    'MASTER 1': 'MASTER 1',
    M2: 'MASTER 2',
    'M 2': 'MASTER 2',
    MASTER2: 'MASTER 2',
    'MASTER 2': 'MASTER 2',
};

function normalizePromotion(value) {
    const rawValue = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
    return PROMOTION_ALIASES[rawValue] || PROMOTION_ALIASES[rawValue.replace(/\s/g, '')] || rawValue;
}

function validatePromotion(value, { required = true, label = 'Promotion' } = {}) {
    const normalized = normalizePromotion(value);

    if (!normalized) {
        if (!required) return '';
        const error = new Error(`${label} obligatoire`);
        error.status = 400;
        throw error;
    }

    if (!VALID_PROMOTIONS.includes(normalized)) {
        const error = new Error(`${label} invalide. Valeurs autorisees : ${VALID_PROMOTIONS.join(', ')}`);
        error.status = 400;
        throw error;
    }

    return normalized;
}

function normalizePromotionsList(value, { required = false, label = 'Promotions' } = {}) {
    const items = Array.isArray(value)
        ? value
        : String(value || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

    if (items.length === 0) {
        if (!required) return '';
        const error = new Error(`${label} obligatoires`);
        error.status = 400;
        throw error;
    }

    return [...new Set(items.map((item) => validatePromotion(item, { required: true, label })))]
        .join(', ');
}

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
        const result = await db.query('SELECT id, matricule, email, nom, post_nom, prenom, role, departement, promotion FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    return demoUsers.find(user => user.id === Number(id)) || null;
}

async function listUsers() {
    if (await databaseReady()) {
        const result = await db.query('SELECT id, matricule, email, nom, post_nom, prenom, role, departement, promotion FROM users ORDER BY id DESC');
        return result.rows;
    }

    return demoUsers.map(publicUser);
}

async function listProfessors() {
    const users = await listUsers();
    return users
        .filter(user => user.role === 'enseignant')
        .map(user => ({
            ...user,
            fullName: [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' '),
        }));
}

async function createUser(payload) {
    const matricule = String(payload.matricule || '').trim();
    const email = String(payload.email || '').trim();
    const nom = String(payload.nom || '').trim();
    const post_nom = String(payload.post_nom || payload.postnom || '').trim();
    const prenom = String(payload.prenom || '').trim();
    const role = payload.role || 'etudiant';
    const departement = String(payload.departement || '').trim();
    const promotion = role === 'etudiant'
        ? validatePromotion(payload.promotion, { required: true })
        : normalizePromotionsList(payload.promotion, { required: role === 'enseignant' });
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

    if (role === 'etudiant' && !departement) {
        const error = new Error('Departement et promotion sont obligatoires pour un etudiant');
        error.status = 400;
        throw error;
    }

    if (role === 'enseignant' && !departement) {
        const error = new Error('Departement et promotions sont obligatoires pour un enseignant');
        error.status = 400;
        throw error;
    }

    if (await findUserByMatricule(matricule)) {
        const error = new Error('Ce matricule existe deja');
        error.status = 409;
        throw error;
    }

    if (email && await databaseReady()) {
        const existingEmail = await db.query('SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
        if (existingEmail.rows.length > 0) {
            const error = new Error('Cet email existe deja');
            error.status = 409;
            throw error;
        }
    }

    if (await databaseReady()) {
        const result = await db.query(
            `INSERT INTO users (matricule, email, nom, post_nom, prenom, role, departement, promotion, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, matricule, email, nom, post_nom, prenom, role, departement, promotion`,
            [matricule, email || null, nom, post_nom, prenom, role, departement, promotion, passwordHash]
        );
        return result.rows[0];
    }

    const user = {
        id: Math.max(...demoUsers.map(item => item.id), 0) + 1,
        matricule,
        email,
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
    const email = String(payload.email || '').trim();
    const nom = String(payload.nom || '').trim();
    const post_nom = String(payload.post_nom || '').trim();
    const prenom = String(payload.prenom || '').trim();
    const role = String(payload.role || 'etudiant').trim();
    const departement = String(payload.departement || '').trim();
    const promotion = role === 'etudiant'
        ? validatePromotion(payload.promotion, { required: true })
        : normalizePromotionsList(payload.promotion, { required: role === 'enseignant' });

    if (!id || !matricule || !nom || !post_nom || !prenom || !role) {
        const error = new Error('Tous les champs sont requis');
        error.status = 400;
        throw error;
    }

    if (!VALID_ROLES.includes(role)) {
        const error = new Error('Role invalide');
        error.status = 400;
        throw error;
    }

    if (role === 'etudiant' && !departement) {
        const error = new Error('Departement et promotion sont obligatoires pour un etudiant');
        error.status = 400;
        throw error;
    }

    if (role === 'enseignant' && !departement) {
        const error = new Error('Departement et promotions sont obligatoires pour un enseignant');
        error.status = 400;
        throw error;
    }

    if (await databaseReady()) {
        if (email) {
            const existingEmail = await db.query('SELECT id FROM users WHERE lower(email) = lower($1) AND id <> $2 LIMIT 1', [email, id]);
            if (existingEmail.rows.length > 0) {
                const error = new Error('Cet email existe deja');
                error.status = 409;
                throw error;
            }
        }

        const result = await db.query(
            `UPDATE users
             SET matricule = $1, email = $2, nom = $3, post_nom = $4, prenom = $5,
                 role = $6, departement = $7, promotion = $8, updated_at = CURRENT_TIMESTAMP
             WHERE id = $9
             RETURNING id, matricule, email, nom, post_nom, prenom, role, departement, promotion`,
            [matricule, email || null, nom, post_nom, prenom, role, departement, promotion, id]
        );
        return result.rows[0] || null;
    }

    const index = demoUsers.findIndex(user => user.id === id);
    if (index === -1) return null;

    demoUsers[index] = { ...demoUsers[index], matricule, email, nom, post_nom, prenom, role, departement, promotion };
    return publicUser(demoUsers[index]);
}

async function resetPassword(matricule, newPassword = DEFAULT_PASSWORD) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

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

async function deleteUser(id, currentUserId) {
    const userId = Number(id);
    if (!userId) {
        const error = new Error('Utilisateur invalide');
        error.status = 400;
        throw error;
    }

    if (Number(currentUserId) === userId) {
        const error = new Error('Vous ne pouvez pas supprimer votre propre compte');
        error.status = 400;
        throw error;
    }

    if (await databaseReady()) {
        const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);
        return result.rowCount > 0;
    }

    const index = demoUsers.findIndex(user => user.id === userId);
    if (index === -1) return false;
    demoUsers.splice(index, 1);
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
        `SELECT id, course_code, course_title, evaluation_types, justification, proof_name, proof_path,
                status, assigned_at, treated_at, published_at, created_at,
                CASE WHEN status = 'published' THEN professor_response ELSE NULL END AS professor_response,
                CASE WHEN status = 'published' THEN professor_decision ELSE NULL END AS professor_decision
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
                r.proof_name, r.proof_path, r.status, r.assigned_professor_id,
                r.professor_response, r.professor_decision, r.assigned_at, r.treated_at,
                r.published_at, r.created_at,
                u.matricule, u.nom, u.post_nom, u.prenom, u.departement, u.promotion,
                p.matricule AS assigned_professor_matricule,
                p.nom AS assigned_professor_nom,
                p.post_nom AS assigned_professor_post_nom,
                p.prenom AS assigned_professor_prenom
         FROM recours r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN users p ON p.id = r.assigned_professor_id
         ORDER BY r.created_at DESC, r.id DESC`
    );

    return result.rows.map((recours) => ({
        ...recours,
        evaluation_types: JSON.parse(recours.evaluation_types || '[]'),
        assignedProfessor: [recours.assigned_professor_prenom, recours.assigned_professor_nom, recours.assigned_professor_post_nom].filter(Boolean).join(' '),
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

async function findRecoursById(recoursId) {
    const result = await db.query(
        `SELECT r.*, u.matricule, u.nom, u.post_nom, u.prenom
         FROM recours r
         JOIN users u ON u.id = r.user_id
         WHERE r.id = $1`,
        [recoursId]
    );

    const recours = result.rows[0];
    if (!recours) return null;

    return {
        ...recours,
        evaluation_types: JSON.parse(recours.evaluation_types || '[]'),
    };
}

async function assignRecoursToProfessor(recoursId, professorId) {
    const professor = await findUserById(professorId);
    if (!professor || professor.role !== 'enseignant') {
        const error = new Error('Professeur introuvable');
        error.status = 404;
        throw error;
    }

    const recours = await findRecoursById(recoursId);
    if (!recours) {
        const error = new Error('Recours introuvable');
        error.status = 404;
        throw error;
    }

    if (recours.status !== 'pending') {
        const error = new Error('Seuls les recours en attente peuvent etre assignes');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `UPDATE recours
         SET assigned_professor_id = $1,
             status = 'assigned',
             assigned_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`,
        [professorId, recoursId]
    );

    return result.rowCount > 0;
}

async function listRecoursForProfessor(professorId) {
    const result = await db.query(
        `SELECT r.id, r.course_code, r.course_title, r.evaluation_types, r.justification,
                r.proof_name, r.proof_path, r.status, r.professor_response,
                r.professor_decision, r.assigned_at, r.treated_at, r.published_at,
                r.created_at, u.matricule, u.nom, u.post_nom, u.prenom,
                u.departement, u.promotion
         FROM recours r
         JOIN users u ON u.id = r.user_id
         WHERE r.assigned_professor_id = $1
         ORDER BY r.assigned_at DESC, r.created_at DESC, r.id DESC`,
        [professorId]
    );

    return result.rows.map((recours) => ({
        ...recours,
        evaluation_types: JSON.parse(recours.evaluation_types || '[]'),
    }));
}

async function submitProfessorTreatment(recoursId, professorId, payload) {
    const decision = String(payload.decision || '').trim();
    const response = String(payload.response || payload.professorResponse || '').trim();

    if (!decision || !response) {
        const error = new Error('Decision et reponse sont obligatoires');
        error.status = 400;
        throw error;
    }

    const recours = await findRecoursById(recoursId);
    if (!recours) {
        const error = new Error('Recours introuvable');
        error.status = 404;
        throw error;
    }

    if (Number(recours.assigned_professor_id) !== Number(professorId)) {
        const error = new Error('Ce recours ne vous est pas assigne');
        error.status = 403;
        throw error;
    }

    if (recours.status !== 'assigned') {
        const error = new Error('Ce recours a deja ete soumis a l administration');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `UPDATE recours
         SET professor_decision = $1,
             professor_response = $2,
             status = 'treated',
             treated_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id`,
        [decision, response, recoursId]
    );

    return result.rowCount > 0;
}

async function publishRecoursToStudent(recoursId) {
    const recours = await findRecoursById(recoursId);
    if (!recours) {
        const error = new Error('Recours introuvable');
        error.status = 404;
        throw error;
    }

    if (recours.status !== 'treated') {
        const error = new Error('Seuls les recours traites par un professeur peuvent etre publies');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `UPDATE recours
         SET status = 'published',
             published_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id`,
        [recoursId]
    );

    return result.rowCount > 0;
}

async function updateRecoursStatus(recoursId, status) {
    const allowedStatuses = ['validated', 'rejected'];
    if (!allowedStatuses.includes(status)) {
        const error = new Error('Statut invalide');
        error.status = 400;
        throw error;
    }

    const recours = await findRecoursById(recoursId);
    if (!recours) {
        const error = new Error('Recours introuvable');
        error.status = 404;
        throw error;
    }

    if (recours.status === 'published') {
        const error = new Error('Un recours publie ne peut plus etre modifie');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        status === 'validated'
            ? `UPDATE recours
               SET status = $1, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2
               RETURNING id`
            : `UPDATE recours
               SET status = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2
               RETURNING id`,
        [status, recoursId]
    );

    return result.rowCount > 0;
}

function normalizeCourseTeacher(value) {
    if (Array.isArray(value)) {
        const error = new Error('Un cours ne peut avoir qu un seul enseignant responsable');
        error.status = 400;
        throw error;
    }

    const teacherName = String(value || '').trim();

    if (!teacherName) {
        const error = new Error('Un enseignant responsable est obligatoire pour un cours');
        error.status = 400;
        throw error;
    }

    if (/[;,]/.test(teacherName)) {
        const error = new Error('Un cours ne peut avoir qu un seul enseignant responsable');
        error.status = 400;
        throw error;
    }

    return teacherName;
}

function normalizeCoursePayload(payload) {
    return {
        code: String(payload.code || '').trim().toUpperCase(),
        title: String(payload.title || payload.nom || '').trim(),
        credits: payload.credits === '' || payload.credits === undefined ? null : Number(payload.credits),
        departement: String(payload.departement || payload.dept || '').trim(),
        teacherName: normalizeCourseTeacher(payload.teacherName || payload.enseignant),
        promotions: normalizePromotionsList(payload.promotions || payload.promos, { required: true }),
    };
}

async function listCourses() {
    const result = await db.query(
        `SELECT id, code, title, credits, departement, teacher_name, promotions, created_at, updated_at
         FROM courses
         ORDER BY code ASC`
    );
    return result.rows;
}

async function createCourse(payload) {
    const course = normalizeCoursePayload(payload);
    if (!course.code || !course.title) {
        const error = new Error('Code et intitule du cours sont obligatoires');
        error.status = 400;
        throw error;
    }

    if (course.credits !== null && (!Number.isInteger(course.credits) || course.credits < 0)) {
        const error = new Error('Le nombre de credits est invalide');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `INSERT INTO courses (code, title, credits, departement, teacher_name, promotions)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, code, title, credits, departement, teacher_name, promotions, created_at, updated_at`,
        [course.code, course.title, course.credits, course.departement || null, course.teacherName, course.promotions || null]
    );

    return result.rows[0];
}

async function updateCourse(id, payload) {
    const course = normalizeCoursePayload(payload);
    if (!course.code || !course.title) {
        const error = new Error('Code et intitule du cours sont obligatoires');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `UPDATE courses
         SET code = $1, title = $2, credits = $3, departement = $4,
             teacher_name = $5, promotions = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, code, title, credits, departement, teacher_name, promotions, created_at, updated_at`,
        [course.code, course.title, course.credits, course.departement || null, course.teacherName, course.promotions || null, id]
    );

    return result.rows[0] || null;
}

async function deleteCourse(id) {
    const result = await db.query('DELETE FROM courses WHERE id = $1', [id]);
    return result.rowCount > 0;
}

async function getAdminSettings() {
    const result = await db.query('SELECT key, value FROM admin_settings');
    const settings = {
        announcement_message: 'La session des recours est ouverte du 25 mai au 05 juin 2026.',
        recours_start_date: '',
        recours_end_date: '',
    };

    for (const row of result.rows) {
        settings[row.key] = row.value;
    }

    return settings;
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getRecoursPeriodStatus(settings) {
    const today = getTodayDateString();
    const startDate = String(settings.recours_start_date || '').trim();
    const endDate = String(settings.recours_end_date || '').trim();

    if (startDate && today < startDate) {
        return {
            isOpen: false,
            state: 'scheduled',
            label: 'Planifiee',
            reason: `La periode de depot commence le ${startDate}`,
        };
    }

    if (endDate && today > endDate) {
        return {
            isOpen: false,
            state: 'closed',
            label: 'Fermee automatiquement',
            reason: `La periode de depot est terminee depuis le ${endDate}`,
        };
    }

    const reason = startDate || endDate
        ? 'La periode de depot des recours est ouverte'
        : 'La periode de depot est ouverte sans limite de date';

    return {
        isOpen: true,
        state: 'open',
        label: 'Ouverte automatiquement',
        reason,
    };
}

function isValidDateSetting(value) {
    return value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isUniqueConstraintError(err) {
    return err && (err.code === '23505' || String(err.message || '').toUpperCase().includes('UNIQUE'));
}

async function setAdminSetting(key, value) {
    await db.query(
        `INSERT INTO admin_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
    );
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
        database: dbAvailable ? 'postgresql' : 'unavailable',
        databaseConfig: {
            host: db.dbConfig.host,
            port: db.dbConfig.port,
            database: db.dbConfig.database,
            user: db.dbConfig.user,
        },
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

app.get('/api/settings/public', async (req, res) => {
    try {
        const settings = await getAdminSettings();
        const period = getRecoursPeriodStatus(settings);
        res.json({
            announcement_message: settings.announcement_message,
            recours_open: period.isOpen,
            recours_start_date: settings.recours_start_date || '',
            recours_end_date: settings.recours_end_date || '',
            recours_status_message: period.reason,
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des parametres' });
    }
});

app.get('/api/cours', authenticateToken, async (req, res) => {
    try {
        const courses = await listCourses();
        res.json({ courses });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des cours' });
    }
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
        const password = String(req.body.password || '');
        const confirmPassword = String(req.body.confirmPassword || '');

        if (['admin', 'superadmin'].includes(requestedRole) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Seul le superadmin peut creer un compte administrateur' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caracteres' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
        }

        const user = await createUser({ ...req.body, role: requestedRole, password });
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
    const newPassword = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caracteres' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
    }

    const done = await resetPassword(req.body.matricule, newPassword);
    if (!done) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: 'Mot de passe reinitialise avec succes' });
});

app.delete('/api/etudiant/users/:id', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const done = await deleteUser(req.params.id, req.user.id);
        if (!done) return res.status(404).json({ message: 'Utilisateur introuvable' });
        res.json({ message: 'Utilisateur supprime avec succes' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la suppression' });
    }
});

app.get('/api/admin/recours', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const recours = await listAllRecours();
        res.json({ recours });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des recours' });
    }
});

app.post('/api/admin/recours/:id/status', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const recoursId = Number(req.params.id);
        const status = String(req.body.status || '').trim();
        if (!recoursId) return res.status(400).json({ message: 'Recours invalide' });

        await updateRecoursStatus(recoursId, status);
        res.json({ message: status === 'validated' ? 'Recours valide avec succes' : 'Recours rejete avec succes' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la mise a jour du recours' });
    }
});

app.get('/api/admin/settings', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const settings = await getAdminSettings();
        res.json({ settings, recours_period: getRecoursPeriodStatus(settings) });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des parametres' });
    }
});

app.put('/api/admin/settings', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const currentSettings = await getAdminSettings();
        const nextStartDate = Object.prototype.hasOwnProperty.call(req.body, 'recours_start_date')
            ? String(req.body.recours_start_date || '').trim()
            : currentSettings.recours_start_date;
        const nextEndDate = Object.prototype.hasOwnProperty.call(req.body, 'recours_end_date')
            ? String(req.body.recours_end_date || '').trim()
            : currentSettings.recours_end_date;

        if (!isValidDateSetting(nextStartDate) || !isValidDateSetting(nextEndDate)) {
            return res.status(400).json({ message: 'Format de date invalide' });
        }

        if (nextStartDate && nextEndDate && nextStartDate > nextEndDate) {
            return res.status(400).json({ message: 'La date de debut doit etre anterieure ou egale a la date de fin' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'announcement_message')) {
            await setAdminSetting('announcement_message', String(req.body.announcement_message || '').trim());
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'recours_start_date')) {
            await setAdminSetting('recours_start_date', nextStartDate);
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'recours_end_date')) {
            await setAdminSetting('recours_end_date', nextEndDate);
        }

        const settings = await getAdminSettings();
        res.json({ message: 'Parametres mis a jour avec succes', settings, recours_period: getRecoursPeriodStatus(settings) });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la mise a jour des parametres' });
    }
});

app.get('/api/admin/cours', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const courses = await listCourses();
        res.json({ courses });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des cours' });
    }
});

app.post('/api/admin/cours', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const course = await createCourse(req.body);
        res.status(201).json({ message: 'Cours ajoute avec succes', course });
    } catch (err) {
        const isUniqueError = isUniqueConstraintError(err);
        res.status(err.status || (isUniqueError ? 409 : 500)).json({ message: isUniqueError ? 'Ce code de cours existe deja' : (err.message || 'Erreur lors de la creation du cours') });
    }
});

app.put('/api/admin/cours/:id', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const course = await updateCourse(Number(req.params.id), req.body);
        if (!course) return res.status(404).json({ message: 'Cours introuvable' });
        res.json({ message: 'Cours modifie avec succes', course });
    } catch (err) {
        const isUniqueError = isUniqueConstraintError(err);
        res.status(err.status || (isUniqueError ? 409 : 500)).json({ message: isUniqueError ? 'Ce code de cours existe deja' : (err.message || 'Erreur lors de la modification du cours') });
    }
});

app.delete('/api/admin/cours/:id', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const done = await deleteCourse(Number(req.params.id));
        if (!done) return res.status(404).json({ message: 'Cours introuvable' });
        res.json({ message: 'Cours supprime avec succes' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la suppression du cours' });
    }
});

app.get('/api/admin/professeurs', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const professeurs = await listProfessors();
        res.json({ professeurs });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des professeurs' });
    }
});

app.post('/api/admin/recours/:id/assigner', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const recoursId = Number(req.params.id);
        const professorId = Number(req.body.professorId || req.body.assignedProfessorId);

        if (!recoursId || !professorId) {
            return res.status(400).json({ message: 'Recours et professeur sont obligatoires' });
        }

        await assignRecoursToProfessor(recoursId, professorId);
        res.json({ message: 'Recours assigne au professeur avec succes' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de l assignation' });
    }
});

app.post('/api/admin/recours/:id/publier', authenticateToken, requireRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const recoursId = Number(req.params.id);
        if (!recoursId) return res.status(400).json({ message: 'Recours invalide' });

        await publishRecoursToStudent(recoursId);
        res.json({ message: 'Reponse publiee a l etudiant avec succes' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la publication' });
    }
});

app.get('/api/professeur/recours', authenticateToken, requireRoles('enseignant'), async (req, res) => {
    try {
        const recours = await listRecoursForProfessor(req.user.id);
        res.json({ recours });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors du chargement des recours assignes' });
    }
});

app.post('/api/professeur/recours/:id/traiter', authenticateToken, requireRoles('enseignant'), async (req, res) => {
    try {
        const recoursId = Number(req.params.id);
        if (!recoursId) return res.status(400).json({ message: 'Recours invalide' });

        await submitProfessorTreatment(recoursId, req.user.id, req.body);
        res.json({ message: 'Reponse transmise a l administration avec succes' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Erreur lors du traitement du recours' });
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

app.post('/api/recours', authenticateToken, requireRoles('etudiant'), uploadRecoursFiles, async (req, res) => {
    try {
        const settings = await getAdminSettings();
        const period = getRecoursPeriodStatus(settings);
        if (!period.isOpen) {
            return res.status(403).json({ message: period.reason });
        }

        const courses = parseCoursesPayload(req.body.courses);
        const filesByField = new Map((req.files || []).map((file) => [file.fieldname, file]));

        if (courses.length === 0) {
            return res.status(400).json({ message: 'Aucun cours a soumettre' });
        }

        const existingCourses = await listCourses();
        const coursesByCode = new Map(existingCourses.map((course) => [String(course.code).trim().toUpperCase(), course]));

        const created = [];
        for (const [index, course] of courses.entries()) {
            const storedCourse = coursesByCode.get(String(course.courseCode || '').trim().toUpperCase());
            if (!storedCourse) {
                return res.status(400).json({ message: `Le cours ${course.courseCode || ''} n existe pas dans la base de donnees` });
            }

            const file = filesByField.get(`proof_${index}`);
            created.push(await createRecours(req.user.id, {
                ...course,
                courseCode: storedCourse.code,
                courseTitle: storedCourse.title,
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

db.runMigrations()
    .then(() => seedDefaultUsers())
    .then(() => ensureSuperAdmin())
    .then(() => {
        app.listen(PORT, HOST, (err) => {
            if (err) {
                console.error(`Impossible de lancer le serveur sur ${HOST}:${PORT}`, err);
                process.exit(1);
            }

            console.log(`Serveur opérationnel sur http://${HOST}:${PORT}`);
            console.log(`Base PostgreSQL : ${db.dbConfig.database} (${db.dbConfig.host}:${db.dbConfig.port})`);
        });
    })
    .catch((err) => {
        console.error('Impossible d initialiser la base PostgreSQL', err);
        process.exit(1);
    });
