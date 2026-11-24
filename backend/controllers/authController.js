
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    // Validar campos obligatorios
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Correo y contraseña son obligatorios'
      });
    }

    const correo = email.trim().toLowerCase();

    // Validar formato de correo
    if (!EMAIL_REGEX.test(correo) || correo.length > 254) {
      return res.status(400).json({
        success: false,
        message: 'Formato de correo electrónico inválido'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const usuario = db.prepare(`
      SELECT id, nombre, email, password, rol, activo
      FROM usuarios
      WHERE email = ?
    `).get(correo);

    // Respuesta genérica para no revelar cuentas existentes
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos'
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no configurado');
    }

    const token = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('Error interno de autenticación:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

function perfil(req, res) {
  return res.status(200).json({
    success: true,
    usuario: req.usuario
  });
}

module.exports = { login, perfil };
