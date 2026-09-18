// Pruebas end-to-end (tests/e2e) en un navegador real. No necesitan Supabase:
// tests/e2e/supabase-falso.js intercepta la red y responde por él, así que
// corren igual en el PC y en GitHub Actions.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:8877',
    locale: 'es-CO',
    viewport: { width: 400, height: 820 }, // un celular, que es donde vive la app
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/servidor-estatico.js',
    port: 8877,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '8877',
      // La app queda apuntando a este origen falso; nada sale a la red real.
      FIELDSIGHT_SUPABASE_URL: 'http://supabase.test',
      FIELDSIGHT_ANON_KEY: 'anon-de-pruebas',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
