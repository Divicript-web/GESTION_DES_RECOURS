const db = require('../db');

db.runMigrations()
  .then(() => {
    console.log(`Migrations PostgreSQL appliquees sur ${db.dbConfig.database}.`);
  })
  .catch((err) => {
    console.error('Echec des migrations PostgreSQL', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());
