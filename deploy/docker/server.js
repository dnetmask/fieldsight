/*
 * server.js — servidor estático para el contenedor Docker.
 * Mismo patrón que deploy/azure/server.js (Linux/Node): sirve los
 * archivos estáticos de FieldSight y asegura los encabezados correctos
 * para que la PWA funcione (manifest, service worker).
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Cualquier ruta no encontrada devuelve index.html (la app es de una sola página)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('FieldSight escuchando en el puerto ' + PORT);
});
