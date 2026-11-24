
import {
  test,
  expect,
  request as playwrightRequest
} from '@playwright/test';

// ============================================
// PRUEBAS INTEGRALES - DEVOPS CONTROL
// Casos 06 a 40
// Backend exclusivo: puerto 3001
// ============================================

// Si ya importaste expect y test al inicio,
// conservamos esa importación existente.


test.describe('LOGIN - PRUEBAS DE INTERFAZ', () => {

  test('LOGIN-01: Mostrar formulario de inicio de sesión', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: 'Bienvenido de nuevo'
      })
    ).toBeVisible();

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Iniciar sesión'
      })
    ).toBeVisible();
  });

  test('LOGIN-02: Campos obligatorios', async ({ page }) => {
    await page.goto('/');

    const email = page.locator('#email');
    const password = page.locator('#password');

    await expect(email).toHaveAttribute('required', '');
    await expect(password).toHaveAttribute('required', '');

    await page.getByRole('button', {
      name: 'Iniciar sesión'
    }).click();

    const campoVacio = await email.evaluate(
      elemento => elemento.validity.valueMissing
    );

    expect(campoVacio).toBe(true);
    await expect(email).toBeFocused();
  });

  test('LOGIN-03: Mostrar y ocultar contraseña', async ({ page }) => {
    await page.goto('/');

    const password = page.locator('#password');

    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', {
      name: 'Mostrar contraseña'
    }).click();

    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', {
      name: 'Ocultar contraseña'
    }).click();

    await expect(password).toHaveAttribute('type', 'password');
  });

  test('LOGIN-04: Correo con formato inválido', async ({ page }) => {
    await page.goto('/');

    const email = page.locator('#email');

    await email.fill('correo-invalido');
    await page.locator('#password').fill('Password123!');

    await page.getByRole('button', {
      name: 'Iniciar sesión'
    }).click();

    const formatoInvalido = await email.evaluate(
      elemento => elemento.validity.typeMismatch
    );

    expect(formatoInvalido).toBe(true);
    await expect(email).toBeFocused();
  });

  test('LOGIN-05: Perfil sin token devuelve HTTP 401', async ({ request }) => {
    const respuesta = await request.get(
      'http://127.0.0.1:3001/api/auth/perfil'
    );

    expect(respuesta.status()).toBe(401);

    const datos = await respuesta.json();

    expect(datos.success).toBe(false);
    expect(datos.message).toBe(
      'Token de autenticación requerido'
    );
  });

});

const TEST_API = 'http://127.0.0.1:3001';

const CUENTAS_TEST = {
  admin: {
    email: 'admin.test@example.com',
    password: 'Testing2026#Admin'
  },
  usuario: {
    email: 'usuario.test@example.com',
    password: 'Testing2026#Usuario'
  },
  inactivo: {
    email: 'inactivo.test@example.com',
    password: 'Testing2026#Inactivo'
  }
};

test.describe.serial('PRUEBAS INTEGRALES - DEVOPS CONTROL', () => {
  let api;
  let tokenAdmin;
  let tokenUsuario;
  let loginAdmin;
  let loginUsuario;
  let loginInactivo;
  let idCreado;
  let emailPrueba = 'crud.automatizado@example.com';

  function headersAdmin() {
    return {
      Authorization: `Bearer ${tokenAdmin}`
    };
  }

  function headersUsuario() {
    return {
      Authorization: `Bearer ${tokenUsuario}`
    };
  }

  function nuevoUsuario(datos = {}) {
    return {
      nombre: 'Usuario Automatizado',
      email: emailPrueba,
      password: 'Automatizado2026#',
      rol: 'usuario',
      activo: true,
      ...datos
    };
  }

  async function postUsuario(datos, headers = headersAdmin()) {
    return api.post(`${TEST_API}/api/usuarios`, {
      headers,
      data: datos
    });
  }

  async function abrirDashboard(page) {
    await page.addInitScript((token) => {
      sessionStorage.setItem('token', token);
    }, tokenAdmin);

    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: /Bienvenido, Administrador Testing/
      })
    ).toBeVisible();
  }

  // ============================================
  // PREPARACIÓN DE AUTENTICACIÓN
  // ============================================

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext();

    loginAdmin = await api.post(
      `${TEST_API}/api/auth/login`,
      { data: CUENTAS_TEST.admin }
    );

    if (loginAdmin.status() !== 200) {
      throw new Error(
        `Login admin falló: HTTP ${loginAdmin.status()}`
      );
    }

    tokenAdmin = (await loginAdmin.json()).token;

    loginUsuario = await api.post(
      `${TEST_API}/api/auth/login`,
      { data: CUENTAS_TEST.usuario }
    );

    if (loginUsuario.status() !== 200) {
      throw new Error(
        `Login usuario falló: HTTP ${loginUsuario.status()}`
      );
    }

    tokenUsuario = (await loginUsuario.json()).token;

    loginInactivo = await api.post(
      `${TEST_API}/api/auth/login`,
      { data: CUENTAS_TEST.inactivo }
    );
  });

  test.afterAll(async () => {
    if (api) {
      await api.dispose();
    }
  });

  // ============================================
  // 01. AUTENTICACIÓN - 5 PRUEBAS
  // ============================================

  test('AUTH-06: Administrador inicia sesión con HTTP 200', async () => {
    expect(loginAdmin.status()).toBe(200);

    const datos = await loginAdmin.json();

    expect(datos.success).toBe(true);
    expect(datos.usuario.rol).toBe('admin');
  });

  test('AUTH-07: Login devuelve un token JWT', async () => {
    expect(typeof tokenAdmin).toBe('string');
    expect(tokenAdmin.split('.')).toHaveLength(3);
  });

  test('AUTH-08: Usuario normal puede autenticarse', async () => {
    expect(loginUsuario.status()).toBe(200);

    const datos = await loginUsuario.json();

    expect(datos.usuario.rol).toBe('usuario');
    expect(datos.success).toBe(true);
  });

  test('AUTH-09: Token válido permite consultar perfil', async () => {
    const respuesta = await api.get(
      `${TEST_API}/api/auth/perfil`,
      { headers: headersAdmin() }
    );

    expect(respuesta.status()).toBe(200);

    const datos = await respuesta.json();

    expect(datos.usuario.email).toBe(
      CUENTAS_TEST.admin.email
    );
  });

  test('AUTH-10: Usuario inactivo no puede iniciar sesión', async () => {
    expect(loginInactivo.status()).toBe(403);

    const datos = await loginInactivo.json();

    expect(datos.success).toBe(false);
  });

  // ============================================
  // 02. VALIDACIONES - 8 PRUEBAS
  // ============================================

  test('VAL-01: Rechazar usuario sin nombre', async () => {
    const datos = nuevoUsuario({
      nombre: ''
    });

    const r = await postUsuario(datos);

    expect(r.status()).toBe(400);
    expect((await r.json()).success).toBe(false);
  });

  test('VAL-02: Rechazar nombre de un carácter', async () => {
    const r = await postUsuario(
      nuevoUsuario({ nombre: 'A' })
    );

    expect(r.status()).toBe(400);
  });

  test('VAL-03: Rechazar correo inválido', async () => {
    const r = await postUsuario(
      nuevoUsuario({ email: 'correo-invalido' })
    );

    expect(r.status()).toBe(400);
  });

  test('VAL-04: Rechazar contraseña débil', async () => {
    const r = await postUsuario(
      nuevoUsuario({ password: '123' })
    );

    expect(r.status()).toBe(400);

    const datos = await r.json();

    expect(datos.errores.join(' ')).toContain('contraseña');
  });

  test('VAL-05: Rechazar rol inexistente', async () => {
    const r = await postUsuario(
      nuevoUsuario({ rol: 'superadmin' })
    );

    expect(r.status()).toBe(400);
  });

  test('VAL-06: Rechazar campo no permitido', async () => {
    const r = await postUsuario(
      nuevoUsuario({ permisosEspeciales: true })
    );

    expect(r.status()).toBe(400);
  });

  test('VAL-07: Rechazar correo duplicado', async () => {
    const r = await postUsuario(
      nuevoUsuario({
        email: CUENTAS_TEST.admin.email
      })
    );

    expect(r.status()).toBe(409);

    const datos = await r.json();

    expect(datos.message).toContain(
      'correo ya está registrado'
    );
  });

  test('VAL-08: Rechazar cuerpo vacío', async () => {
    const r = await postUsuario({});

    expect(r.status()).toBe(400);
  });

  // ============================================
  // 03. CRUD COMPLETO - 12 PRUEBAS
  // ============================================

  test('CRUD-01: Crear usuario correctamente', async () => {
    const r = await postUsuario(nuevoUsuario());

    expect(r.status()).toBe(201);

    const datos = await r.json();

    expect(datos.success).toBe(true);
    expect(datos.usuario.email).toBe(emailPrueba);

    idCreado = datos.usuario.id;
  });

  test('CRUD-02: Consultar usuario por ID', async () => {
    const r = await api.get(
      `${TEST_API}/api/usuarios/${idCreado}`,
      { headers: headersAdmin() }
    );

    expect(r.status()).toBe(200);

    const datos = await r.json();

    expect(datos.usuario.id).toBe(idCreado);
  });

  test('CRUD-03: Listar usuarios registrados', async () => {
    const r = await api.get(
      `${TEST_API}/api/usuarios`,
      { headers: headersAdmin() }
    );

    expect(r.status()).toBe(200);

    const datos = await r.json();

    expect(datos.usuarios.length).toBeGreaterThanOrEqual(4);
  });

  test('CRUD-04: Editar nombre de usuario', async () => {
    const r = await api.put(
      `${TEST_API}/api/usuarios/${idCreado}`,
      {
        headers: headersAdmin(),
        data: { nombre: 'Usuario Editado Playwright' }
      }
    );

    expect(r.status()).toBe(200);

    const datos = await r.json();

    expect(datos.usuario.nombre).toBe(
      'Usuario Editado Playwright'
    );
  });

  test('CRUD-05: Actualizar correo electrónico', async () => {
    emailPrueba = 'crud.editado@example.com';

    const r = await api.put(
      `${TEST_API}/api/usuarios/${idCreado}`,
      {
        headers: headersAdmin(),
        data: { email: emailPrueba }
      }
    );

    expect(r.status()).toBe(200);

    const datos = await r.json();

    expect(datos.usuario.email).toBe(emailPrueba);
  });

  test('CRUD-06: Cambiar rol a administrador', async () => {
    const r = await api.put(
      `${TEST_API}/api/usuarios/${idCreado}`,
      {
        headers: headersAdmin(),
        data: { rol: 'admin' }
      }
    );

    expect(r.status()).toBe(200);
    expect((await r.json()).usuario.rol).toBe('admin');
  });

  test('CRUD-07: Cambiar rol a usuario normal', async () => {
    const r = await api.put(
      `${TEST_API}/api/usuarios/${idCreado}`,
      {
        headers: headersAdmin(),
        data: { rol: 'usuario' }
      }
    );

    expect(r.status()).toBe(200);
    expect((await r.json()).usuario.rol).toBe('usuario');
  });

  test('CRUD-08: Actualizar contraseña', async () => {
    const r = await api.put(
      `${TEST_API}/api/usuarios/${idCreado}`,
      {
        headers: headersAdmin(),
        data: { password: 'Actualizada2026#Segura' }
      }
    );

    expect(r.status()).toBe(200);

    const datos = await r.json();

    expect(datos.usuario.password).toBeUndefined();
  });

  test('CRUD-09: Desactivar usuario', async () => {
    const r = await api.delete(
      `${TEST_API}/api/usuarios/${idCreado}`,
      { headers: headersAdmin() }
    );

    expect(r.status()).toBe(200);
    expect((await r.json()).success).toBe(true);
  });

  test('CRUD-10: Reactivar usuario', async () => {
    const r = await api.put(
      `${TEST_API}/api/usuarios/${idCreado}`,
      {
        headers: headersAdmin(),
        data: { activo: true }
      }
    );

    expect(r.status()).toBe(200);
    expect((await r.json()).usuario.activo).toBe(1);
  });

  test('CRUD-11: Desactivar usuario nuevamente', async () => {
    const r = await api.delete(
      `${TEST_API}/api/usuarios/${idCreado}`,
      { headers: headersAdmin() }
    );

    expect(r.status()).toBe(200);
  });

  test('CRUD-12: Confirmar eliminación lógica', async () => {
    const r = await api.get(
      `${TEST_API}/api/usuarios/${idCreado}`,
      { headers: headersAdmin() }
    );

    expect(r.status()).toBe(200);

    const datos = await r.json();

    expect(datos.usuario.activo).toBe(0);
    expect(datos.usuario.id).toBe(idCreado);
  });

  // ============================================
  // 04. SEGURIDAD Y PERMISOS - 6 PRUEBAS
  // ============================================

  test('SEC-01: Rechazar consulta sin token', async () => {
    const r = await api.get(
      `${TEST_API}/api/usuarios`
    );

    expect(r.status()).toBe(401);
  });

  test('SEC-02: Rechazar token inválido', async () => {
    const r = await api.get(
      `${TEST_API}/api/usuarios`,
      {
        headers: {
          Authorization: 'Bearer token-invalido'
        }
      }
    );

    expect(r.status()).toBe(401);
  });

  test('SEC-03: Usuario normal no puede listar usuarios', async () => {
    const r = await api.get(
      `${TEST_API}/api/usuarios`,
      { headers: headersUsuario() }
    );

    expect(r.status()).toBe(403);
  });

  test('SEC-04: Usuario normal no puede crear usuarios', async () => {
    const r = await postUsuario(
      nuevoUsuario({
        email: 'no-autorizado@example.com'
      }),
      headersUsuario()
    );

    expect(r.status()).toBe(403);
  });

  test('SEC-05: Admin no puede eliminar su cuenta', async () => {
    const r = await api.delete(
      `${TEST_API}/api/usuarios/1`,
      { headers: headersAdmin() }
    );

    expect(r.status()).toBe(403);
  });

  test('SEC-06: Admin no puede quitarse su rol', async () => {
    const r = await api.put(
      `${TEST_API}/api/usuarios/1`,
      {
        headers: headersAdmin(),
        data: { rol: 'usuario' }
      }
    );

    expect(r.status()).toBe(403);
  });

  // ============================================
  // 05. DASHBOARD Y NAVEGACIÓN - 4 PRUEBAS
  // ============================================

  test('DASH-01: Visualizar dashboard con JWT', async ({ page }) => {
    await abrirDashboard(page);

    await expect(
      page.getByRole('heading', {
        name: 'Gestión de usuarios'
      })
    ).toBeVisible();
  });

  test('DASH-02: Mostrar estadísticas de usuarios', async ({ page }) => {
    await abrirDashboard(page);

    await expect(
      page.locator('.admin-stat-card')
    ).toHaveCount(4);

    await expect(
      page.getByText('Usuarios totales', { exact: true })
    ).toBeVisible();
  });

  test('DASH-03: Buscar usuarios por nombre', async ({ page }) => {
    await abrirDashboard(page);

    await page.getByRole('textbox', {
      name: 'Buscar usuarios'
    }).fill('Administrador Testing');

    await expect(
      page.locator('.admin-table tbody tr')
    ).toHaveCount(1);

    await expect(
      page.locator('.admin-table tbody')
    ).toContainText('Administrador Testing');
  });

  test('DASH-04: Abrir y cerrar formulario', async ({ page }) => {
    await abrirDashboard(page);

    await page.getByRole('button', {
      name: 'Nuevo usuario'
    }).click();

    const modal = page.getByRole('dialog');

    await expect(modal).toBeVisible();

    await expect(
      modal.getByRole('heading', {
        name: 'Nuevo usuario'
      })
    ).toBeVisible();

    await modal.getByRole('button', {
      name: 'Cancelar'
    }).click();

    await expect(modal).not.toBeVisible();
  });

});
