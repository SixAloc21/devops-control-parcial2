
const express = require('express');

const router = express.Router();

const {
  verificarToken,
  soloAdmin
} = require('../middleware/authMiddleware');

const {
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  editarUsuario,
  eliminarUsuario
} = require('../controllers/usuariosController');

// Todas las rutas requieren autenticación
// y permisos de administrador
router.use(verificarToken, soloAdmin);

// CREATE
router.post('/', crearUsuario);

// READ
router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);

// UPDATE
router.put('/:id', editarUsuario);

// DELETE - Desactivación lógica
router.delete('/:id', eliminarUsuario);

module.exports = router;
