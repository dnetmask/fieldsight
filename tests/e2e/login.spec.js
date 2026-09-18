const { test, expect } = require('@playwright/test');
const { instalarSupabaseFalso, iniciarSesion, USUARIO, CONTRASENA } = require('./supabase-falso');

test.beforeEach(async ({ page }) => { await instalarSupabaseFalso(page); });

test('la pantalla de acceso muestra el logo real y valida campos vacíos', async ({ page }) => {
  await page.goto('/');
  const logo = page.locator('#authView img');
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  await page.click('#btnAuthSubmit');
  await expect(page.locator('#authError')).toHaveText('Completa correo y contraseña');
});

test('el registro exige nombre y una contraseña de al menos 8 caracteres', async ({ page }) => {
  await page.goto('/');
  await page.click('#btnAuthToggle');
  await expect(page.locator('#btnAuthSubmit')).toHaveText('Crear cuenta');
  await page.fill('#authEmail', 'nuevo@fieldsight.local');
  await page.fill('#authPassword', 'abc1234');
  await page.click('#btnAuthSubmit');
  await expect(page.locator('#authError')).toHaveText('Escribe tu nombre completo');
  await page.fill('#authNombre', 'Nuevo Usuario');
  await page.click('#btnAuthSubmit');
  await expect(page.locator('#authError')).toHaveText('La contraseña debe tener al menos 8 caracteres');
});

test('credenciales incorrectas muestran un mensaje claro y no entran', async ({ page }) => {
  await page.goto('/');
  await page.fill('#authEmail', USUARIO.email);
  await page.fill('#authPassword', 'equivocada!');
  await page.click('#btnAuthSubmit');
  await expect(page.locator('#authError')).toHaveText('Correo o contraseña incorrectos');
  await expect(page.locator('.topbar')).toBeHidden();
});

test('inicia sesión, muestra nombre y rol, y el administrador ve el botón de administrar', async ({ page }) => {
  await iniciarSesion(page);
  await expect(page.locator('#brandUserLabel')).toHaveText(`${USUARIO.nombre} · ${USUARIO.rol}`);
  await expect(page.locator('.brand-logo')).toBeVisible();
  await expect(page.locator('#btnAdmin')).toBeVisible();
  await expect(page.locator('#formView')).toBeVisible();
  await expect(page.locator('#authView')).toBeHidden();
});

test('un técnico no ve el botón de administrar', async ({ page }) => {
  await instalarSupabaseFalso(page, { usuario: { ...USUARIO, rol: 'tecnico' } });
  await page.goto('/');
  await page.fill('#authEmail', USUARIO.email);
  await page.fill('#authPassword', CONTRASENA);
  await page.click('#btnAuthSubmit');
  await page.waitForSelector('.topbar:not(.hidden)');
  await expect(page.locator('#brandUserLabel')).toContainText('tecnico');
  await expect(page.locator('#btnAdmin')).toBeHidden();
});
