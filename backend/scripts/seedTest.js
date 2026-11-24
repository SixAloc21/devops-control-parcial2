
const path = require('path');

if (process.env.NODE_ENV !== 'test') {
  console.error(
    'ERROR: Este script solo funciona con NODE_ENV=test'
  );

  process.exit(1);
}

const bcrypt = require('bcryptjs');
const db = require('../database/db');

// ============================================
// CREDENCIALES FICTICIAS DE TESTING
// ============================================

const USUARIOS_TEST = [
  {
    nombre: 'Administrador Testing',
    email: 'admin.test@example.com',
    password: 'Testing2026#Admin',
    rol: 'admin',
    activo: 1
  },
  {
    nombre: 'Usuario Testing',
    email: 'usuario.test@example.com',
    password: 'Testing2026#Usuario',
    rol: 'usuario',
    activo: 1
  },
  {
    nombre: 'Usuario Inactivo',
    email: 'inactivo.test@example.com',
    password: 'Testing2026#Inactivo',
    rol: 'usuario',
    activo: 0
  }
];

// ============================================
// PREPARAR DATOS
// ============================================

async function prepararTesting() {
  try {
    const insertar = db.prepare(`
      INSERT INTO usuarios
      (nombre, email, password, rol, activo)
      VALUES (?, ?, ?, ?, ?)
    `);

    const registros = [];

    for (const usuario of USUARIOS_TEST) {
      const hash = await bcrypt.hash(
        usuario.password,
        12
      );

      registros.push([
        usuario.nombre,
        usuario.email,
        hash,
        usuario.rol,
        usuario.activo
      ]);
    }

    const reiniciar = db.transaction(() => {
      db.prepare('DELETE FROM usuarios').run();

      db.prepare(
        "DELETE FROM sqlite_sequence WHERE name = 'usuarios'"
      ).run();

      for (const valores of registros) {
        insertar.run(...valores);
      }
    });

    reiniciar();

    console.log('=================================');
    console.log(' BASE DE DATOS DE TESTING');
    console.log('=================================');
    console.log('Usuarios de prueba preparados');

    const usuarios = db.prepare(`
      SELECT id, nombre, email, rol, activo
      FROM usuarios
      ORDER BY id
    `).all();

    console.table(usuarios);

  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

prepararTesting();
