const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db'); // Ton fichier db.js existant

const app = express();
const SECRET_KEY = 'CLE_SECRETE_ULPGL_2026'; // À changer en production

// Middlewares
app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. Route de Test de connexion
app.get('/test', (req, res) => {
    res.json({ message: "Serveur actif !" });
});

// 2. Route de Connexion (Login)
app.post('/login', async (req, res) => {
    const { matricule, password } = req.body;

    try {
        // Rechercher l'utilisateur par matricule
        const result = await db.query('SELECT * FROM users WHERE matricule = $1', [matricule]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Matricule inconnu' });
        }

        const user = result.rows[0];

        // Comparer le mot de passe avec le hash en base
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
            role: user.role 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// 3. Route pour récupérer les infos du profil (exemple protégé)
app.get('/profile', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'Accès refusé' });

    try {
        const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY);
        const user = await db.query('SELECT nom, post_nom, prenom, role FROM users WHERE id = $1', [decoded.id]);
        res.json(user.rows[0]);
    } catch (err) {
        res.status(401).json({ message: 'Token invalide' });
    }
});

// --- LANCEMENT ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur opérationnel sur http://localhost:${PORT}`);
});