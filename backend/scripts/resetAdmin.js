
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../database/db');

async function resetAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'Faltan ADMIN_EMAIL o ADMIN_PASSWORD en .env'
      );
    }

    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new Error(
        'La contraseña debe tener mínimo 12 caracteres, mayúscula, minúscula, número y símbolo'
      );
    }

    const usuario = db.prepare(`
      SELECT id, email, rol
      FROM usuarios
      WHERE email = ? AND rol = 'admin'
    `).get(email);

    if (!usuario) {
      throw new Error('No se encontró el administrador');
    }

    const hash = await bcrypt.hash(password, 12);

    db.prepare(`
      UPDATE usuarios
      SET password = ?,
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hash, usuario.id);

    console.log('Contraseña actualizada correctamente');
    console.log('Administrador:', usuario.email);

  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

resetAdmin();
