
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../database/db');

async function main() {
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
  const email = (process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 72 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      'Configura ADMIN_EMAIL y una ADMIN_PASSWORD segura.'
    );
  }

  const existe = db.prepare(
    'SELECT id FROM usuarios WHERE email = ?'
  ).get(email);

  if (existe) {
    console.log('El administrador ya existe. No se modificó.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  db.prepare(`
    INSERT INTO usuarios
    (nombre, email, password, rol, activo)
    VALUES (?, ?, ?, 'admin', 1)
  `).run(nombre, email, hash);

  console.log('Administrador de Docker creado correctamente.');
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
