
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  console.log('\n====================================');
  console.log(' DEVOPS CONTROL - TESTING');
  console.log('====================================');
  console.log('Preparando base SQLite de pruebas...');

  const backendPath = path.resolve(__dirname, '../backend');

  try {
    execFileSync(
      process.execPath,
      ['scripts/seedTest.js'],
      {
        cwd: backendPath,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DB_PATH: path.join(
            backendPath,
            'database',
            'usuarios_test.db'
          )
        },
        stdio: 'inherit',
        timeout: 30000
      }
    );

    console.log('Base de testing preparada correctamente.');
    console.log('Iniciando pruebas automatizadas...\n');

  } catch (error) {
    console.error('No se pudo preparar SQLite Testing.');
    throw error;
  }
}
