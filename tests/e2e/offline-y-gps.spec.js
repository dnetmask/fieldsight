const { test, expect } = require('@playwright/test');
const { instalarSupabaseFalso, iniciarSesion } = require('./supabase-falso');

test.describe('GPS', () => {
  test.use({ geolocation: { latitude: 6.17, longitude: -75.59, accuracy: 12 }, permissions: ['geolocation'] });

  test('captura la ubicación y muestra coordenadas, precisión y enlace al mapa', async ({ page }) => {
    await instalarSupabaseFalso(page);
    await iniciarSesion(page);
    await page.click('#btnGps');
    await expect(page.locator('#gpsCoord')).toHaveText('6.170000, -75.590000');
    await expect(page.locator('#gpsMeta')).toContainText('Precisión ±12 m');
    await expect(page.locator('#gpsLink')).toHaveAttribute('href', 'https://maps.google.com/?q=6.17,-75.59');
    await expect(page.locator('#btnGps')).toBeEnabled();
  });
});

test.describe('Sin red', () => {
  test('la app abre desde la caché del service worker aunque no haya conexión', async ({ page, context }) => {
    await instalarSupabaseFalso(page);
    await page.goto('/');
    // Espera a que el service worker controle la página y haya precacheado lo
    // esencial (incluida la librería de Supabase, que viene de un CDN externo).
    // Se sondea dentro de la página: waitForFunction no espera predicados async.
    await page.evaluate(async () => {
      const inicio = Date.now();
      while (Date.now() - inicio < 25000) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active && navigator.serviceWorker.controller) {
          const nombres = await caches.keys();
          if (nombres.length) {
            const c = await caches.open(nombres[0]);
            if ((await c.match('./index.html')) && (await c.match('./js/config.js'))
              && (await c.match('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'))) return;
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error('El service worker no quedó activo con la caché lista');
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#authView')).toBeVisible();
    await expect(page.locator('#authView img')).toBeVisible();
    expect(await page.evaluate(() => typeof supabaseClient !== 'undefined' && supabaseClient !== null)).toBe(true);
    await expect(page.locator('#btnAuthSubmit')).toBeEnabled();
    await context.setOffline(false);
  });
});
