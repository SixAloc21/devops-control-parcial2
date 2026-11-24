
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../api';
import './Dashboard.css';

// ============================================
// CONFIGURACIÓN INICIAL DEL FORMULARIO
// ============================================

const FORM_INICIAL = {
  nombre: '',
  email: '',
  password: '',
  rol: 'usuario',
  activo: true
};

export default function Dashboard({ usuario, cerrarSesion }) {
  // Estados de usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoEstado, setProcesandoEstado] = useState(false);

  // Mensajes
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Búsqueda y filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');

  // Formulario modal
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ...FORM_INICIAL });
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const esAdmin = usuario?.rol === 'admin';

  // ============================================
  // PETICIONES A LA API
  // ============================================

  const peticion = useCallback(async (ruta, opciones = {}) => {
    const token = sessionStorage.getItem('token');

    if (!token) {
      cerrarSesion();
      throw new Error('Debes iniciar sesión nuevamente.');
    }

    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        Authorization: `Bearer ${token}`,
        ...opciones.headers
      }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        cerrarSesion();

        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.'
        );
      }

      const detalle =
        datos.message ||
        (Array.isArray(datos.errores)
          ? datos.errores.join('. ')
          : null) ||
        `Error HTTP ${respuesta.status}`;

      throw new Error(detalle);
    }

    return datos;
  }, [cerrarSesion]);

  // ============================================
  // CONSULTAR USUARIOS
  // ============================================

  const cargarUsuarios = useCallback(async () => {
    if (!esAdmin) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError('');

    try {
      const datos = await peticion('/api/usuarios');

      setUsuarios(
        Array.isArray(datos.usuarios) ? datos.usuarios : []
      );

    } catch (err) {
      setError(err.message || 'Error al consultar usuarios.');

    } finally {
      setCargando(false);
    }
  }, [esAdmin, peticion]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const estadisticas = useMemo(() => ({
    total: usuarios.length,

    activos: usuarios.filter(
      u => Number(u.activo) === 1
    ).length,

    inactivos: usuarios.filter(
      u => Number(u.activo) === 0
    ).length,

    admins: usuarios.filter(
      u => u.rol === 'admin'
    ).length

  }), [usuarios]);

  // ============================================
  // FILTROS Y BÚSQUEDA
  // ============================================

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter(u => {
      const coincide =
        u.nombre.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto) ||
        String(u.id).includes(texto);

      const estado =
        filtro === 'todos' ||
        (filtro === 'activos' && Number(u.activo) === 1) ||
        (filtro === 'inactivos' && Number(u.activo) === 0) ||
        (filtro === 'admin' && u.rol === 'admin') ||
        (filtro === 'usuario' && u.rol === 'usuario');

      return coincide && estado;
    });
  }, [usuarios, busqueda, filtro]);

  // ============================================
  // ABRIR FORMULARIO NUEVO USUARIO
  // ============================================

  function nuevoUsuario() {
    setForm({ ...FORM_INICIAL });
    setEditando(null);
    setMostrarPassword(false);
    setError('');
    setMensaje('');
    setModal(true);
  }

  // ============================================
  // ABRIR FORMULARIO DE EDICIÓN
  // ============================================

  function editarUsuario(u) {
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      activo: Number(u.activo) === 1
    });

    setEditando(u.id);
    setMostrarPassword(false);
    setError('');
    setMensaje('');
    setModal(true);
  }

  // ============================================
  // CERRAR FORMULARIO
  // ============================================

  function cerrarModal() {
    if (guardando) return;

    setModal(false);
    setEditando(null);
    setForm({ ...FORM_INICIAL });
    setError('');
    setMostrarPassword(false);
  }

  // ============================================
  // ACTUALIZAR CAMPOS
  // ============================================

  function actualizarCampo(e) {
    const { name, value } = e.target;

    setForm(actual => ({
      ...actual,
      [name]: value
    }));
  }

  // ============================================
  // VALIDACIONES DEL FORMULARIO
  // ============================================

  function validarFormulario() {
    if (
      form.nombre.trim().length < 2 ||
      form.nombre.trim().length > 100
    ) {
      return 'El nombre debe tener entre 2 y 100 caracteres.';
    }

    const correo = form.email.trim();

    if (
      correo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      return 'Introduce un correo electrónico válido.';
    }

    if (!editando || form.password) {
      const p = form.password;

      if (
        p.length < 12 ||
        p.length > 72 ||
        !/[A-Z]/.test(p) ||
        !/[a-z]/.test(p) ||
        !/[0-9]/.test(p) ||
        !/[^A-Za-z0-9]/.test(p)
      ) {
        return (
          'La contraseña debe tener entre 12 y 72 caracteres, ' +
          'mayúscula, minúscula, número y símbolo.'
        );
      }
    }

    if (
      editando === usuario.id &&
      (form.rol !== 'admin' || !form.activo)
    ) {
      return (
        'No puedes quitarte permisos ni desactivar tu cuenta.'
      );
    }

    return null;
  }

  // ============================================
  // CREAR O EDITAR USUARIO
  // ============================================

  async function guardarUsuario(e) {
    e.preventDefault();
    setError('');
    setMensaje('');

    const validacion = validarFormulario();

    if (validacion) {
      setError(validacion);
      return;
    }

    const datos = {
      nombre: form.nombre.trim(),
      email: form.email.trim().toLowerCase(),
      rol: form.rol,
      activo: form.activo
    };

    if (form.password) {
      datos.password = form.password;
    }

    setGuardando(true);

    try {
      let mensajeExito = '';

      if (editando !== null) {
        await peticion(`/api/usuarios/${editando}`, {
          method: 'PUT',
          body: JSON.stringify(datos)
        });

        mensajeExito = 'Usuario actualizado correctamente.';

      } else {
        await peticion('/api/usuarios', {
          method: 'POST',
          body: JSON.stringify(datos)
        });

        mensajeExito = 'Usuario creado correctamente.';
      }

      setModal(false);
      setEditando(null);
      setForm({ ...FORM_INICIAL });

      await cargarUsuarios();

      setMensaje(mensajeExito);

    } catch (err) {
      setError(err.message || 'No se pudo guardar el usuario.');

    } finally {
      setGuardando(false);
    }
  }

  // ============================================
  // DESACTIVAR / REACTIVAR USUARIO
  // ============================================

  async function cambiarEstado(u) {
    if (procesandoEstado) return;

    setError('');
    setMensaje('');

    if (u.id === usuario.id) {
      setError('No puedes desactivar tu propia cuenta.');
      return;
    }

    const activo = Number(u.activo) === 1;

    const confirmar = window.confirm(
      activo
        ? `¿Deseas desactivar a ${u.nombre}?`
        : `¿Deseas reactivar a ${u.nombre}?`
    );

    if (!confirmar) return;

    setProcesandoEstado(true);

    try {
      if (activo) {
        await peticion(`/api/usuarios/${u.id}`, {
          method: 'DELETE'
        });

      } else {
        await peticion(`/api/usuarios/${u.id}`, {
          method: 'PUT',
          body: JSON.stringify({ activo: true })
        });
      }

      await cargarUsuarios();

      setMensaje(
        activo
          ? 'Usuario desactivado correctamente.'
          : 'Usuario reactivado correctamente.'
      );

    } catch (err) {
      setError(
        err.message || 'No se pudo actualizar el estado.'
      );

    } finally {
      setProcesandoEstado(false);
    }
  }

  // ============================================
  // INTERFAZ PRINCIPAL
  // ============================================

  return (
    <div className="admin-layout">

      {/* MENÚ LATERAL */}

      <aside className="admin-sidebar">

        <div className="admin-brand">
          <span className="admin-brand-icon">D</span>
          <span>DEVOPS CONTROL</span>
        </div>

        <div className="admin-nav-label">
          MENÚ PRINCIPAL
        </div>

        <nav className="admin-navigation">
          <a href="#inicio" className="active">
            Panel principal
          </a>

          {esAdmin && (
            <a href="#usuarios">
              Gestión de usuarios
            </a>
          )}
        </nav>

        <div className="admin-sidebar-bottom">
          <span>Proyecto Parcial 2</span>
          <small>DevOps · CI/CD · Observabilidad</small>
        </div>

      </aside>

      {/* CONTENIDO */}

      <div className="admin-main">

        {/* BARRA SUPERIOR */}

        <header className="admin-topbar">

          <div className="admin-topbar-title">
            Sistema de Gestión de Usuarios
          </div>

          <div className="admin-topbar-actions">

            <span className="admin-avatar">
              {usuario.nombre.charAt(0).toUpperCase()}
            </span>

            <span className="admin-topbar-user">
              {usuario.nombre}
            </span>

            <button
              type="button"
              className="admin-btn-outline"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>

          </div>

        </header>

        <main className="admin-content" id="inicio">

          {/* BIENVENIDA */}

          <div className="admin-heading">

            <div>
              <span className="admin-eyebrow">
                PANEL DE ADMINISTRACIÓN
              </span>

              <h1>Bienvenido, {usuario.nombre}</h1>

              <p>
                Administra y supervisa los usuarios
                registrados en tu sistema.
              </p>
            </div>

            {esAdmin && (
              <button
                type="button"
                className="admin-btn-primary"
                onClick={nuevoUsuario}
              >
                + Nuevo usuario
              </button>
            )}

          </div>

          {/* MENSAJES */}

          {mensaje && (
            <div
              className="admin-alert success"
              role="status"
            >
              {mensaje}
            </div>
          )}

          {error && !modal && (
            <div
              className="admin-alert error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* USUARIO SIN PERMISOS */}

          {!esAdmin ? (
            <section className="admin-panel">
              <h2>Mi perfil</h2>

              <p>Correo: {usuario.email}</p>
              <p>Rol: {usuario.rol}</p>

              <p>
                Tu cuenta no tiene permisos para
                administrar usuarios.
              </p>
            </section>

          ) : (
            <>

              {/* ESTADÍSTICAS */}

              <div className="admin-stats">
                {[
                  ['Usuarios totales', estadisticas.total],
                  ['Usuarios activos', estadisticas.activos],
                  ['Usuarios inactivos', estadisticas.inactivos],
                  ['Administradores', estadisticas.admins]
                ].map(([titulo, numero]) => (
                  <div
                    className="admin-stat-card"
                    key={titulo}
                  >
                    <span>{titulo}</span>
                    <strong>{numero}</strong>
                    <small>Datos de SQLite</small>
                  </div>
                ))}
              </div>

              {/* GESTIÓN DE USUARIOS */}

              <section className="admin-panel" id="usuarios">

                <div className="admin-panel-heading">
                  <div>
                    <h2>Gestión de usuarios</h2>

                    <p>
                      Consulta, registra, edita y
                      administra los accesos.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-btn-outline"
                    onClick={cargarUsuarios}
                    disabled={cargando}
                  >
                    Actualizar
                  </button>
                </div>

                {/* BUSCADOR Y FILTROS */}

                <div className="admin-filters">

                  <input
                    aria-label="Buscar usuarios"
                    placeholder="Buscar por nombre, correo o ID..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />

                  <select
                    aria-label="Filtrar usuarios"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Inactivos</option>
                    <option value="admin">Administradores</option>
                    <option value="usuario">Usuarios normales</option>
                  </select>

                </div>

                {/* TABLA */}

                <div className="admin-table-wrapper">

                  <table className="admin-table">

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!cargando && filtrados.map((u) => (
                        <tr key={u.id}>

                          <td>#{u.id}</td>

                          <td>
                            <strong>{u.nombre}</strong>
                          </td>

                          <td>{u.email}</td>

                          <td>{u.rol}</td>

                          <td>
                            <span
                              className={
                                Number(u.activo) === 1
                                  ? 'admin-status active'
                                  : 'admin-status inactive'
                              }
                            >
                              {Number(u.activo) === 1
                                ? 'Activo'
                                : 'Inactivo'}
                            </span>
                          </td>

                          <td>
                            <div className="admin-actions">

                              <button
                                type="button"
                                className="admin-btn-edit"
                                onClick={() => editarUsuario(u)}
                              >
                                Editar
                              </button>

                              {u.id !== usuario.id && (
                                <button
                                  type="button"
                                  className="admin-btn-danger"
                                  disabled={procesandoEstado}
                                  onClick={() => cambiarEstado(u)}
                                >
                                  {Number(u.activo) === 1
                                    ? 'Desactivar'
                                    : 'Reactivar'}
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>

                  </table>

                </div>

                {cargando && (
                  <p className="admin-empty">
                    Cargando usuarios...
                  </p>
                )}

                {!cargando && filtrados.length === 0 && (
                  <p className="admin-empty">
                    No se encontraron usuarios.
                  </p>
                )}

                <div className="admin-table-footer">
                  Mostrando {filtrados.length} de {usuarios.length} usuarios
                </div>

              </section>

            </>
          )}

        </main>

      </div>

      {/* MODAL CREAR / EDITAR */}

      {modal && (
        <div className="admin-modal-overlay">

          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
          >

            <div className="admin-modal-heading">

              <h2 id="admin-modal-title">
                {editando !== null
                  ? 'Editar usuario'
                  : 'Nuevo usuario'}
              </h2>

              <button
                type="button"
                className="admin-modal-close"
                aria-label="Cerrar formulario"
                onClick={cerrarModal}
                disabled={guardando}
              >
                ×
              </button>

            </div>

            <form onSubmit={guardarUsuario}>

              {/* NOMBRE */}

              <label htmlFor="admin-nombre">
                Nombre completo
              </label>

              <input
                id="admin-nombre"
                name="nombre"
                value={form.nombre}
                onChange={actualizarCampo}
                minLength={2}
                maxLength={100}
                required
                disabled={guardando}
              />

              {/* CORREO */}

              <label htmlFor="admin-email">
                Correo electrónico
              </label>

              <input
                id="admin-email"
                type="email"
                name="email"
                value={form.email}
                onChange={actualizarCampo}
                maxLength={254}
                required
                disabled={guardando}
              />

              {/* CONTRASEÑA */}

              <label htmlFor="admin-password">
                {editando !== null
                  ? 'Nueva contraseña (opcional)'
                  : 'Contraseña'}
              </label>

              <div className="admin-password-field">

                <input
                  id="admin-password"
                  type={mostrarPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={actualizarCampo}
                  autoComplete="new-password"
                  minLength={editando !== null ? undefined : 12}
                  maxLength={72}
                  required={editando === null}
                  disabled={guardando}
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarPassword(!mostrarPassword)
                  }
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>

              </div>

              <p className="admin-password-hint">
                Mínimo 12 caracteres, mayúscula,
                minúscula, número y símbolo.
              </p>

              {/* ROL */}

              <label htmlFor="admin-rol">
                Rol
              </label>

              <select
                id="admin-rol"
                name="rol"
                value={form.rol}
                onChange={actualizarCampo}
                disabled={guardando}
              >
                <option value="usuario">
                  Usuario
                </option>

                <option value="admin">
                  Administrador
                </option>
              </select>

              {/* ESTADO */}

              {editando !== null && (
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    disabled={guardando}
                    onChange={(e) =>
                      setForm(actual => ({
                        ...actual,
                        activo: e.target.checked
                      }))
                    }
                  />
                  Cuenta activa
                </label>
              )}

              {/* ERRORES DEL MODAL */}

              {error && (
                <div
                  className="admin-alert error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* BOTONES */}

              <div className="admin-modal-buttons">

                <button
                  type="button"
                  className="admin-btn-outline"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  className="admin-btn-primary"
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? 'Guardando...'
                    : editando !== null
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
