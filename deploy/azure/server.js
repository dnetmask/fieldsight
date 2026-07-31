/*
 * server.js — SOLO para App Service en plan LINUX (Node).
 * Si tu App Service es Windows/IIS, borra este archivo y
 * package.json — usa web.config en su lugar.
 *
 * Sirve los archivos estáticos de FieldSight (index.html, manifest.json,
 * sw.js, icons/) y asegura los encabezados correctos para que la PWA
 * funcione (manifest, service worker).
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

// Cualquier ruta no encontrada devuelve index.html (la app es de una sola página)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('FieldSight escuchando en el puerto ' + PORT);
});
