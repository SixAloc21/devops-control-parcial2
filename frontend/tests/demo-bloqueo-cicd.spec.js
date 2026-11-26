import { test, expect } from '@playwright/test';

test('DEMO-01: detectar una validacion incorrecta', async () => {
  const codigoEsperado = 500;
  const codigoReal = 200;

  expect(codigoReal).toBe(codigoEsperado);
});
