
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CAMPOS_PUBLICOS = `
  id, nombre, email, rol, activo,
  creado_en, actualizado_en
`;

function validarDatos(datos, esEdicion = false) {
  const errores = [];

  const permitidos = ['nombre', 'email', 'password', 'rol', 'activo'];

  for (const campo of Object.keys(datos)) {
    if (!permitidos.includes(campo)) {
      errores.push(`Campo no permitido: ${campo}`);
    }
  }

  if (!esEdicion || datos.nombre !== undefined) {
    if (typeof datos.nombre !== 'string' ||
        datos.nombre.trim().length < 2 ||
        datos.nombre.trim().length > 100) {
      errores.push('El nombre debe tener entre 2 y 100 caracteres');
    }
  }

  if (!esEdicion || datos.email !== undefined) {
    if (typeof datos.email !== 'string' ||
        datos.email.length > 254 ||
        !EMAIL_REGEX.test(datos.email.trim())) {
      errores.push('Correo electrónico inválido');
    }
  }

  if (!esEdicion || datos.password !== undefined) {
    const p = datos.password;

    if (typeof p !== 'string' ||
        p.length < 12 ||
        p.length > 72 ||
        !/[A-Z]/.test(p) ||
        !/[a-z]/.test(p) ||
        !/[0-9]/.test(p) ||
        !/[^A-Za-z0-9]/.test(p)) {
      errores.push(
        'La contraseña debe tener entre 12 y 72 caracteres, mayúscula, minúscula, número y símbolo'
      );
    }
  }

  if (datos.rol !== undefined &&
      !['admin', 'usuario'].includes(datos.rol)) {
    errores.push('Rol inválido');
  }

  if (datos.activo !== undefined &&
      datos.activo !== 0 &&
      datos.activo !== 1 &&
      datos.activo !== true &&
      datos.activo !== false) {
    errores.push('El estado activo debe ser verdadero o falso');
  }

  return errores;
}

function idValido(req, res) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      success: false,
      message: 'ID de usuario inválido'
    });
    return null;
  }

  return id;
}

function buscarUsuario(id) {
  return db.prepare(`
    SELECT ${CAMPOS_PUBLICOS}
    FROM usuarios
    WHERE id = ?
  `).get(id);
}

// CREAR
async function crearUsuario(req, res, next) {
  try {
    const datos = req.body;

    if (!datos || typeof datos !== 'object' ||
        Array.isArray(datos)) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
    }

    const errores = validarDatos(datos);

    if (errores.length) {
      return res.status(400).json({
        success: false,
        errores
      });
    }

    const email = datos.email.trim().toLowerCase();

    const existe = db.prepare(
      'SELECT id FROM usuarios WHERE email = ?'
    ).get(email);

    if (existe) {
      return res.status(409).json({
        success: false,
        message: 'El correo ya está registrado'
      });
    }

    const hash = await bcrypt.hash(datos.password, 12);

    const resultado = db.prepare(`
      INSERT INTO usuarios (nombre, email, password, rol, activo)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      datos.nombre.trim(),
      email,
      hash,
      datos.rol || 'usuario',
      datos.activo === false || datos.activo === 0 ? 0 : 1
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      usuario: buscarUsuario(resultado.lastInsertRowid)
    });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'El correo ya está registrado'
      });
    }
    next(error);
  }
}

// LISTAR
function listarUsuarios(req, res, next) {
  try {
    const usuarios = db.prepare(`
      SELECT ${CAMPOS_PUBLICOS}
      FROM usuarios
      ORDER BY id DESC
    `).all();

    res.status(200).json({
      success: true,
      total: usuarios.length,
      usuarios
    });
  } catch (error) {
    next(error);
  }
}

// CONSULTAR POR ID
function obtenerUsuario(req, res, next) {
  try {
    const id = idValido(req, res);
    if (id === null) return;

    const usuario = buscarUsuario(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      usuario
    });
  } catch (error) {
    next(error);
  }
}

// EDITAR
async function editarUsuario(req, res, next) {
  try {
    const id = idValido(req, res);
    if (id === null) return;

    const usuario = buscarUsuario(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const datos = req.body;

    if (!datos || typeof datos !== 'object' ||
        Array.isArray(datos) ||
        Object.keys(datos).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar datos para actualizar'
      });
    }

    const errores = validarDatos(datos, true);

    if (errores.length) {
      return res.status(400).json({
        success: false,
        errores
      });
    }

    const nombre = datos.nombre !== undefined
      ? datos.nombre.trim() : usuario.nombre;

    const email = datos.email !== undefined
      ? datos.email.trim().toLowerCase() : usuario.email;

    const rol = datos.rol ?? usuario.rol;

    const activo = datos.activo === undefined
      ? usuario.activo
      : Number(datos.activo);

    // Impedir que un administrador se quite sus propios permisos.
    if (id === req.usuario.id &&
        (rol !== 'admin' || activo !== 1)) {
      return res.status(403).json({
        success: false,
        message: 'No puedes desactivar tu cuenta ni quitarte el rol administrador'
      });
    }

    const repetido = db.prepare(`
      SELECT id FROM usuarios
      WHERE email = ? AND id != ?
    `).get(email, id);

    if (repetido) {
      return res.status(409).json({
        success: false,
        message: 'El correo ya pertenece a otro usuario'
      });
    }

    const columnas = [
      'nombre = ?',
      'email = ?',
      'rol = ?',
      'activo = ?',
      'actualizado_en = CURRENT_TIMESTAMP'
    ];

    const valores = [nombre, email, rol, activo];

    if (datos.password !== undefined) {
      const hash = await bcrypt.hash(datos.password, 12);
      columnas.push('password = ?');
      valores.push(hash);
    }

    valores.push(id);

    db.prepare(`
      UPDATE usuarios
      SET ${columnas.join(', ')}
      WHERE id = ?
    `).run(...valores);

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado correctamente',
      usuario: buscarUsuario(id)
    });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'El correo ya pertenece a otro usuario'
      });
    }
    next(error);
  }
}

// DESACTIVAR (BORRADO LÓGICO)
function eliminarUsuario(req, res, next) {
  try {
    const id = idValido(req, res);
    if (id === null) return;

    const usuario = buscarUsuario(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (id === req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    if (!usuario.activo) {
      return res.status(409).json({
        success: false,
        message: 'El usuario ya se encuentra desactivado'
      });
    }

    db.prepare(`
      UPDATE usuarios
      SET activo = 0,
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    return res.status(200).json({
      success: true,
      message: 'Usuario desactivado correctamente'
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  editarUsuario,
  eliminarUsuario
};
