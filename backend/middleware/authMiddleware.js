
const jwt = require('jsonwebtoken');
const db = require('../database/db');

function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization ||
      !/^Bearer\s+\S+$/i.test(authorization)) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido'
    });
  }

  try {
    const token = authorization.replace(/^Bearer\s+/i, '');

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );

    const usuario = db.prepare(`
      SELECT id, nombre, email, rol, activo
      FROM usuarios
      WHERE id = ?
    `).get(payload.id);

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Sesión no válida'
      });
    }

    req.usuario = usuario;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    console.error('Error de autenticación:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso exclusivo para administradores'
    });
  }

  next();
}

module.exports = { verificarToken, soloAdmin };
