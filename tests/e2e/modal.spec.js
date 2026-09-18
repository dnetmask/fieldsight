const { test, expect } = require('@playwright/test');
const { instalarSupabaseFalso, iniciarSesion } = require('./supabase-falso');

const PNG_1PX = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

test.beforeEach(async ({ page }) => {
  await instalarSupabaseFalso(page);
  await iniciarSesion(page);
});

test('cerrar sesión pide confirmación con el modal propio, no con confirm() del navegador', async ({ page }) => {
  let dialogoNativo = false;
  page.on('dialog', (d) => { dialogoNativo = true; d.dismiss(); });
  await page.click('button[title="Cerrar sesión"]');
  const modal = page.locator('.modal-backdrop');
  await expect(modal).toBeVisible();
  await expect(modal.locator('p')).toHaveText('¿Cerrar sesión?');
  await expect(modal.locator('.modal-aceptar')).toHaveText('Cerrar sesión');
  await modal.locator('.modal-cancelar').click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.topbar')).toBeVisible();
  expect(dialogoNativo).toBe(false);
});

test('Escape y tocar el fondo cancelan; un modal no descartable exige el botón', async ({ page }) => {
  const resultadoEscape = page.evaluate(() => confirmar('x'));
  await page.locator('.modal-backdrop').waitFor();
  await page.keyboard.press('Escape');
  expect(await resultadoEscape).toBe(false);

  const resultadoFondo = page.evaluate(() => confirmar('x'));
  await page.locator('.modal-backdrop').waitFor();
  await page.mouse.click(5, 5);
  expect(await resultadoFondo).toBe(false);

  const resultadoFijo = page.evaluate(() => confirmar('borrador', { descartable: false, cancelar: 'Descartar borrador' }));
  await page.locator('.modal-backdrop').waitFor();
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await expect(page.locator('.modal-backdrop')).toBeVisible();
  await page.locator('.modal-cancelar').click();
  expect(await resultadoFijo).toBe(false);
});

test('pedirTexto no acepta vacío, y Enter envía el texto', async ({ page }) => {
  const resultado = page.evaluate(() => pedirTexto('Nombre', { titulo: 'Nuevo tipo de activo', placeholder: 'Ej. Firewall', aceptar: 'Agregar' }));
  const campo = page.locator('.modal-campo');
  await expect(campo).toBeFocused();
  await page.locator('.modal-aceptar').click();
  await expect(campo).toHaveClass(/input-invalid/);
  await expect(page.locator('.modal-backdrop')).toBeVisible();
  await campo.fill('  Firewall  ');
  await campo.press('Enter');
  expect(await resultado).toBe('Firewall');
});

test('el botón de quitar foto tiene un área táctil de 40×40 y pide confirmación', async ({ page }) => {
  await page.click('#topt-activos');
  await page.evaluate((png) => {
    activos[0].fotos.push({ cat: 'Frontal', dataUrl: png });
    renderPhotoGrid('grid-act-' + activos[0].uid, activos[0], 'fotos');
  }, PNG_1PX);
  const del = page.locator('.photo-thumb .del');
  await expect(del).toHaveAttribute('aria-label', 'Quitar foto');
  const caja = await del.boundingBox();
  expect(caja.width).toBeGreaterThanOrEqual(40);
  expect(caja.height).toBeGreaterThanOrEqual(40);

  await del.click();
  const modal = page.locator('.modal-backdrop');
  await expect(modal.locator('p')).toHaveText('¿Quitar esta foto?');
  await expect(modal.locator('.modal-aceptar')).toHaveClass(/btn-danger/);
  await modal.locator('.modal-cancelar').click();
  await expect(page.locator('.photo-thumb')).toHaveCount(1);
  await del.click();
  await modal.locator('.modal-aceptar').click();
  await expect(page.locator('.photo-thumb')).toHaveCount(0);
});

test('quitar un activo vacío no pregunta; con datos, sí y dice cuántas fotos se van', async ({ page }) => {
  await page.click('#topt-activos');
  await page.locator('.rep-del').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  await expect(page.locator('.rep-card')).toHaveCount(0);

  await page.evaluate((png) => {
    addActivo();
    activos[0].nombre = 'Switch core';
    activos[0].fotos.push({ cat: 'x', dataUrl: png }, { cat: 'y', dataUrl: png });
  }, PNG_1PX);
  await page.locator('.rep-del').click();
  const modal = page.locator('.modal-backdrop');
  await expect(modal.locator('h3')).toHaveText('¿Quitar activo?');
  await expect(modal.locator('p')).toHaveText('Se quitará este activo y sus 2 fotos de la visita.');
  await modal.locator('.modal-cancelar').click();
  await expect(page.locator('.rep-card')).toHaveCount(1);
});
