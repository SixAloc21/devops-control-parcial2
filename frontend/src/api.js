
// ============================================
// DEVOPS CONTROL - CONFIGURACIÓN API
// ============================================

// Desarrollo local:
//   http://localhost:3000
//
// Playwright:
//   VITE_API_URL=http://localhost:3001
//
// Docker y despliegue:
//   URL relativa a través de Nginx

export const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? ''
    : 'http://localhost:3000');
