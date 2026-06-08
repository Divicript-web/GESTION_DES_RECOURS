const { Pool } = require('pg');

// Configure la connexion avec tes identifiants locaux
const pool = new Pool({
  user: 'postgres',           // Par défaut, c'est 'postgres'
  host: 'localhost',
  database: 'ulpgl_db',       // Nom de la base que tu dois créer dans pgAdmin
  password: 'Divin2006', // Le mot de passe que tu as défini à l'installation
  port: 5432,
});

pool.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à PostgreSQL :', err.stack);
  } else {
    console.log('Connexion réussie à la base de données PostgreSQL !');
  }
});

module.exports = pool;