
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({

  // ==========================================
  // CONFIGURACIÓN GENERAL
  // ==========================================

  testDir: './tests',

  globalSetup: './global-setup.js',

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: 0,

  workers: 1,

  timeout: 30000,

  // ==========================================
  // REPORTES
  // ==========================================

  reporter: [
    ['list'],

    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }],

    ['junit', {
      outputFile: 'test-results/results.xml'
    }]
  ],

  // ==========================================
  // NAVEGADOR
  // ==========================================

  use: {
    baseURL: 'http://localhost:5174',

    trace: 'retain-on-failure',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    actionTimeout: 10000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // ==========================================
  // SERVIDORES AUTOMÁTICOS
  // ==========================================

  webServer: [
    
{
  // ==========================================
  // BACKEND EXPRESS - TESTING
  // ==========================================

  command: 'node ../backend/server.js',

  url: 'http://localhost:3001/health',

  reuseExistingServer: false,

  timeout: 30000,

  env: {
    NODE_ENV: 'test',
    PORT: '3001',
    FRONTEND_URL: 'http://localhost:5174',

    // Clave exclusiva para el entorno de pruebas
    JWT_SECRET: process.env.TEST_JWT_SECRET,
  }
},


    {
      // Frontend React Testing
      command:
        'npm run dev -- --host localhost --port 5174 --strictPort',

      url: 'http://localhost:5174',

      reuseExistingServer: false,

      timeout: 30000,

      env: {
        VITE_API_URL: 'http://localhost:3001'
      }
    }
  ]
});
