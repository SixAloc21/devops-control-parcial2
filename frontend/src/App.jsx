
import { useEffect, useState } from 'react';
import './App.css';

import Dashboard from './components/Dashboard';
import { API_URL } from './api';

// ============================================
// DEVOPS CONTROL - APLICACIÓN PRINCIPAL
// ============================================

function App() {
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Estados de autenticación
  const [usuario, setUsuario] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // ============================================
  // CERRAR SESIÓN
  // ============================================

  function cerrarSesion() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');

    setUsuario(null);
    setEmail('');
    setPassword('');
    setMostrarPassword(false);
    setError('');
  }

  // ============================================
  // VERIFICAR SESIÓN AL RECARGAR
  // ============================================

  useEffect(() => {
    let activo = true;

    async function verificarSesion() {
      const token = sessionStorage.getItem('token');

      if (!token) {
        sessionStorage.removeItem('usuario');

        if (activo) {
          setVerificandoSesion(false);
        }

        return;
      }

      try {
        const respuesta = await fetch(
          `${API_URL}/api/auth/perfil`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!respuesta.ok) {
          throw new Error('Sesión inválida o expirada');
        }

        const datos = await respuesta.json();

        if (!datos.success || !datos.usuario) {
          throw new Error('No se pudo verificar la sesión');
        }

        if (activo) {
          setUsuario(datos.usuario);

          sessionStorage.setItem(
            'usuario',
            JSON.stringify(datos.usuario)
          );
        }

      } catch {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('usuario');

        if (activo) {
          setUsuario(null);
        }

      } finally {
        if (activo) {
          setVerificandoSesion(false);
        }
      }
    }

    verificarSesion();

    return () => {
      activo = false;
    };
  }, []);

  // ============================================
  // VALIDAR FORMULARIO
  // ============================================

  function validarFormulario() {
    if (!email.trim() || !password) {
      return 'Todos los campos son obligatorios.';
    }

    const correo = email.trim().toLowerCase();

    if (
      correo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      return 'Introduce un correo electrónico válido.';
    }

    if (password.length > 128) {
      return 'La contraseña supera la longitud permitida.';
    }

    return null;
  }

  // ============================================
  // INICIAR SESIÓN
  // ============================================

  async function iniciarSesion(event) {
    event.preventDefault();
    setError('');

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password
          })
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        if (respuesta.status === 429) {
          throw new Error(
            'Demasiados intentos de inicio de sesión. Inténtalo más tarde.'
          );
        }

        throw new Error(
          datos.message || 'No se pudo iniciar sesión.'
        );
      }

      if (!datos.success || !datos.token || !datos.usuario) {
        throw new Error(
          'El servidor devolvió una respuesta de autenticación inválida.'
        );
      }

      // Guardar información de sesión
      sessionStorage.setItem('token', datos.token);

      sessionStorage.setItem(
        'usuario',
        JSON.stringify(datos.usuario)
      );

      setUsuario(datos.usuario);
      setPassword('');
      setError('');

    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.'
          : err.message || 'Error inesperado de conexión.'
      );

    } finally {
      setCargando(false);
    }
  }

  // ============================================
  // VERIFICACIÓN DE SESIÓN
  // ============================================

  if (verificandoSesion) {
    return (
      <div className="login-page">
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            gap: '15px',
            background: '#f8faff',
            color: '#17213a'
          }}
        >
          <h2>DEVOPS CONTROL</h2>
          <p>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // DASHBOARD ADMINISTRATIVO
  // ============================================

  if (usuario) {
    return (
      <Dashboard
        usuario={usuario}
        cerrarSesion={cerrarSesion}
      />
    );
  }

  // ============================================
  // PANTALLA DE LOGIN
  // ============================================

  return (
    <div className="login-page">

      {/* PANEL IZQUIERDO */}

      <section className="login-info">

        <div className="brand">
          <div className="brand-icon">D</div>
          <span>DEVOPS CONTROL</span>
        </div>

        <div className="hero-content">

          <div className="hero-tag">
            PLATAFORMA DE ADMINISTRACIÓN
          </div>

          <h1>
            Gestión inteligente.
            <br />
            <span>Control total.</span>
          </h1>

          <p>
            Administra usuarios, controla accesos
            y supervisa la actividad de tu sistema
            desde una plataforma centralizada.
          </p>

          <div className="features">
            <div>✓ Autenticación segura con JWT</div>
            <div>✓ Administración de usuarios</div>
            <div>✓ Monitoreo y observabilidad</div>
            <div>✓ Infraestructura automatizada</div>
          </div>

        </div>

        <div className="hero-footer">
          Proyecto Parcial 2 · DevOps & CI/CD
        </div>

      </section>

      {/* PANEL DERECHO */}

      <section className="login-form-section">

        <div className="login-container">

          <div className="login-header">

            <div className="login-icon">
              🔐
            </div>

            <h2>Bienvenido de nuevo</h2>

            <p>
              Ingresa tus credenciales para
              acceder al sistema.
            </p>

          </div>

          <form onSubmit={iniciarSesion}>

            {/* CORREO ELECTRÓNICO */}

            <div className="form-group">

              <label htmlFor="email">
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                maxLength={254}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={cargando}
              />

            </div>

            {/* CONTRASEÑA */}

            <div className="form-group">

              <label htmlFor="password">
                Contraseña
              </label>

              <div className="password-container">

                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Introduce tu contraseña"
                  value={password}
                  maxLength={128}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={cargando}
                />

                <button
                  type="button"
                  className="toggle-password"
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                  aria-pressed={mostrarPassword}
                  onClick={() =>
                    setMostrarPassword(!mostrarPassword)
                  }
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>

              </div>

            </div>

            {/* MENSAJE DE ERROR */}

            {error && (
              <div
                className="error-message"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* BOTÓN INICIAR SESIÓN */}

            <button
              className="btn-login"
              type="submit"
              disabled={cargando}
            >
              {cargando
                ? 'Verificando credenciales...'
                : 'Iniciar sesión'}
            </button>

          </form>

          <div className="login-security">
            Autenticación mediante JWT
          </div>

        </div>

        <div className="login-footer">
          © 2026 DevOps Control · Proyecto Académico
        </div>

      </section>

    </div>
  );
}

export default App;
