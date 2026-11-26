import { test, expect } from '@playwright/test';

test('CI/CD debe bloquear despliegue con pruebas fallidas', async () => {
  expect(200).toBe(500);
});
