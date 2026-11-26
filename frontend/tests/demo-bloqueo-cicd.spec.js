import { test, expect } from '@playwright/test';

test('DEMO-CI: bloquear despliegue ante prueba fallida', async () => {
  expect(200).toBe(500);
});
