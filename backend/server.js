
require('dotenv').config();

// ============================================
// PARCIAL 2 - DEVOPS
// BACKEND NODE.JS + EXPRESS + SQLITE
// ============================================

// IMPORTACIONES
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./database/db');

const {
  login,
  perfil
} = require('./controllers/authController');

const {
  verificarToken
} = require('./middleware/authMiddleware');

const usuariosRoutes = require('./routes/usuariosRoutes');

// ============================================
// CONFIGURACIÓN GENERAL
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// Confiar en Nginx como proxy inverso
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

app.use(express.json({
  limit: '10kb'
}));

// ============================================
// MIDDLEWARE DE LOGS HTTP
// ============================================

app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracionMs =
      Number(process.hrtime.bigint() - inicio) / 1e6;

    const log = {
      timestamp: new Date().toISOString(),
      metodo: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      duracionMs: Number(duracionMs.toFixed(2)),
      accion: `${req.method} ${req.path}`,
      resultado: res.statusCode >= 400
        ? 'ERROR'
        : 'SUCCESS'
    };

    console.log(JSON.stringify(log));
  });

  next();
});

// ============================================
// SEGURIDAD DEL LOGIN
// ============================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 100 : 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos. Inténtalo más tarde.'
  }
});

// ============================================
// AUTENTICACIÓN
// ============================================

// POST - Iniciar sesión
app.post('/api/auth/login', loginLimiter, login);

// GET - Consultar perfil autenticado
app.get('/api/auth/perfil', verificarToken, perfil);

// ============================================
// CRUD COMPLETO DE USUARIOS
// ============================================

// Las rutas internas requieren JWT y rol admin
app.use('/api/usuarios', usuariosRoutes);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INFORMACIÓN DEL BACKEND
// ============================================

app.get('/', (req, res) => {
  res.status(200).json({
    proyecto: 'Parcial 2 - DevOps',
    backend: 'Node.js + Express',
    database: 'SQLite',
    estado: 'Activo'
  });
});

// ============================================
// ESTADO SQLITE - SOLO DESARROLLO
// ============================================

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/database/status', (req, res, next) => {
    try {
      const resultado = db.prepare(`
        SELECT COUNT(*) AS total
        FROM usuarios
      `).get();

      res.status(200).json({
        status: 'OK',
        database: 'SQLite',
        tabla: 'usuarios',
        totalUsuarios: resultado.total
      });
    } catch (error) {
      next(error);
    }
  });
}

// ============================================
// RUTAS NO ENCONTRADAS
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================

app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    tipo: 'ERROR_INTERNO',
    metodo: req.method,
    endpoint: req.path,
    mensaje: err.message
  }));

  if (err.status === 400 || err.status === 413) {
    return res.status(err.status).json({
      success: false,
      message: err.status === 413
        ? 'La solicitud excede el tamaño permitido'
        : 'JSON inválido'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// ============================================
// INICIO DEL SERVIDOR
// ============================================

const server = app.listen(PORT, () => {
  console.log('====================================');
  console.log(' PARCIAL 2 - DEVOPS');
  console.log('====================================');
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('Base de datos: SQLite');
  console.log('CRUD: /api/usuarios');
  console.log('====================================');
});

server.on('error', (error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exitCode = 1;
});
