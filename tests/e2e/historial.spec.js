const { test, expect } = require('@playwright/test');
const { instalarSupabaseFalso, iniciarSesion, visitasDePrueba } = require('./supabase-falso');

let falso;
test.beforeEach(async ({ page }) => {
  falso = await instalarSupabaseFalso(page, { visitas: visitasDePrueba(65) });
  await iniciarSesion(page);
  await page.click('#tabHist');
});

test('pagina de a 30 y muestra el avance en el botón hasta agotar la lista', async ({ page }) => {
  const items = page.locator('#histList .hist-item');
  await expect(items).toHaveCount(30);
  const boton = page.locator('#histMasWrap button');
  await expect(boton).toHaveText('Cargar más visitas (30 de 65)');
  await boton.click();
  await expect(items).toHaveCount(60);
  await expect(boton).toHaveText('Cargar más visitas (60 de 65)');
  await boton.click();
  await expect(items).toHaveCount(65);
  await expect(page.locator('#histMasWrap')).toHaveCount(0);

  const consultas = falso.peticiones.filter((p) => p.ruta === '/rest/v1/visitas' && p.metodo === 'GET');
  expect(consultas.map((p) => p.query.offset)).toEqual(['0', '30', '60']);
  expect(consultas[0].query.select).not.toContain('data');
  expect(consultas[0].query.select).not.toContain('*');
});

test('busca por texto en el servidor y muestra cuántas coinciden', async ({ page }) => {
  await page.fill('#histBuscar', 'ecopetrol');
  await expect(page.locator('#histList .hist-item')).toHaveCount(13);
  await expect(page.locator('#histList')).toContainText('13 visitas coinciden con la búsqueda');
  const conOr = falso.peticiones.filter((p) => p.ruta === '/rest/v1/visitas' && p.query.or);
  expect(conOr.length).toBe(1); // debounce: tres letras no son tres consultas... una sola tras escribir
  expect(conOr[0].query.or).toContain('cliente.ilike.%ecopetrol%');
});

test('filtra por rango de fechas y permite quitar los filtros', async ({ page }) => {
  await page.click('.hist-filtro-toggle');
  await page.fill('#histDesde', '2026-08-20');
  await page.fill('#histHasta', '2026-08-25');
  await expect(page.locator('#histList')).toContainText('coinciden con la búsqueda');
  const filtrada = falso.peticiones.filter((p) => p.ruta === '/rest/v1/visitas' && p.query.fecha).at(-1);
  expect(filtrada).toBeTruthy();

  await page.fill('#histBuscar', 'zzzz');
  await expect(page.locator('#histList')).toContainText('Ninguna visita coincide con la búsqueda');
  await page.click('#histList button:has-text("Quitar filtros")');
  await expect(page.locator('#histBuscar')).toHaveValue('');
  await expect(page.locator('#histList .hist-item')).toHaveCount(30);
});

test('abrir una visita muestra su detalle con la marca', async ({ page }) => {
  await page.locator('#histList .hist-item').first().click();
  await expect(page.locator('#detailView')).toBeVisible();
  await expect(page.locator('#detailContent .rep-header h2')).toHaveText('Sede 065');
  await expect(page.locator('#detailContent')).toContainText('NETMASK S.A.S.');
  const detalle = falso.peticiones.filter((p) => p.ruta === '/rest/v1/visitas' && p.query.id).at(-1);
  expect(detalle.query.select).toBe('*');
});
