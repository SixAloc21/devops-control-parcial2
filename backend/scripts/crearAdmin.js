
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../database/db');

async function crearAdministrador() {
  try {
    const nombre = process.env.ADMIN_NOMBRE;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!nombre || !email || !password) {
      throw new Error(
        'Configura ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_PASSWORD'
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('El correo no tiene un formato válido');
    }

    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new Error(
        'La contraseña debe tener 12 caracteres, mayúscula, minúscula, número y símbolo'
      );
    }

    const existente = db.prepare(
      'SELECT id FROM usuarios WHERE email = ?'
    ).get(email);

    if (existente) {
      console.log('El administrador ya existe. No se duplicó.');
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    const resultado = db.prepare(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES (?, ?, ?, 'admin')
    `).run(nombre.trim(), email, hash);

    console.log('Administrador creado correctamente');
    console.log('ID:', resultado.lastInsertRowid);
    console.log('Correo:', email);
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

crearAdministrador();
