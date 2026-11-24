
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURACIÓN DE SQLITE
// ============================================

const esTesting = process.env.NODE_ENV === 'test';

const archivoDatabase = esTesting
  ? 'usuarios_test.db'
  : 'usuarios.db';

const databasePath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, archivoDatabase);

// Evitar que las pruebas utilicen la BD principal
const databaseProduccion = path.resolve(
  __dirname,
  'usuarios.db'
);

if (
  esTesting &&
  databasePath.toLowerCase() ===
    databaseProduccion.toLowerCase()
) {
  throw new Error(
    'SEGURIDAD: El entorno de pruebas no puede usar usuarios.db'
  );
}

fs.mkdirSync(path.dirname(databasePath), {
  recursive: true
});

const db = new Database(databasePath);

// ============================================
// CONFIGURACIÓN DE SQLITE
// ============================================

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ============================================
// TABLA DE USUARIOS
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password TEXT NOT NULL,

    rol TEXT NOT NULL DEFAULT 'usuario'
      CHECK (rol IN ('admin', 'usuario')),

    activo INTEGER NOT NULL DEFAULT 1
      CHECK (activo IN (0, 1)),

    creado_en TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    actualizado_en TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log(JSON.stringify({
  evento: 'DATABASE_INITIALIZED',
  entorno: process.env.NODE_ENV || 'development',
  archivo: path.basename(databasePath),
  estado: 'OK'
}));

module.exports = db;
