const bcrypt = require('bcrypt');

const password = 'ULPGL2026';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) throw err;
    console.log("Voici ton nouveau hash à copier :");
    console.log(hash);
});