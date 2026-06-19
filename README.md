# Gestion des recours

Application Node.js/Express avec frontend statique pour la gestion des recours et une base PostgreSQL.

## Prerequis

- Node.js 20 ou plus recent
- npm
- Un serveur PostgreSQL accessible

## Configuration

Copier l'exemple d'environnement puis adapter les valeurs si necessaire :

```bash
cp Back_end/.env.example Back_end/.env
```

Variables principales :

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=gestion_recours
DB_USER=recours_user
DB_PASSWORD=recours_password
```

## Base PostgreSQL

Configurer `Back_end/.env` avec les informations de la base PostgreSQL que vous souhaitez connecter :

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=gestion_recours
DB_USER=recours_user
DB_PASSWORD=recours_password
```

Si PostgreSQL est installe localement et que la base n'existe pas encore, vous pouvez creer l'utilisateur et la base :

```bash
sudo -u postgres psql
```

```sql
CREATE USER recours_user WITH PASSWORD 'recours_password';
CREATE DATABASE gestion_recours OWNER recours_user;
\q
```

## Installer et migrer

```bash
cd Back_end
npm install
npm run migrate
```

Les migrations SQL sont dans `Back_end/migrations`. Elles creent notamment les tables `users`, `recours`, `courses`, `admin_settings` et `schema_migrations`.

## Demarrer le projet

En developpement :

```bash
cd Back_end
npm run dev
```

En mode standard :

```bash
cd Back_end
npm start
```

Le serveur est disponible par defaut sur `http://127.0.0.1:3001`.

## Verification

```bash
curl http://127.0.0.1:3001/health
```

La reponse doit indiquer `database: "postgresql"`.

## Depannage PostgreSQL

Si le demarrage affiche `password authentication failed`, PostgreSQL refuse les identifiants fournis dans `Back_end/.env`. Verifier en priorite :

- `DB_USER` correspond a un utilisateur PostgreSQL existant.
- `DB_PASSWORD` est le mot de passe exact de cet utilisateur.
- `DB_NAME` correspond au nom reel de la base. PostgreSQL transforme les noms non quotes en minuscules, donc preferer un nom comme `gr_database` ou `gestion_recours`.

Pour tester les memes identifiants manuellement :

```bash
psql -h 127.0.0.1 -p 5432 -U postgres -d GR_DataBase
```

## Notes de migration depuis SQLite

Le projet utilisait auparavant `better-sqlite3` avec un fichier local `Back_end/data/recours.sqlite`. La configuration cible maintenant PostgreSQL via `pg` et les variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

Les migrations initialisent un nouveau schema PostgreSQL. Si des donnees SQLite existantes doivent etre conservees, il faut les exporter puis les importer dans PostgreSQL avant de passer en production.
