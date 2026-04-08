import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { iniciarScheduler } from "./emailScheduler";
import cors from 'cors';
import compression from 'compression';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === 'production';

app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cors());

if (isProduction) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/') && (req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.woff2') || req.path.endsWith('.woff'))) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (req.path.match(/\.(jpeg|jpg|png|webp|svg|ico|gif)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    next();
  });
}

app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

// Función asíncrona para inicializar todo
async function startServer() {
  try {
    // 1. Registrar rutas API PRIMERO
    log('Registrando rutas API...');
    await registerRoutes(app);
    
    // 2. Configurar Vite (que maneja el frontend y fallback)
    if (!isProduction) {
      log('Configurando Vite...');
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    log('Servidor configurado correctamente');
  } catch (error) {
    console.error('Error de configuración:', error);
    process.exit(1);
  }
}

// Inicializar el servidor
const server = app.listen(PORT, HOST, () => {
  log(`Servidor iniciado en ${HOST}:${PORT}`);
  // Configurar todo después de que el servidor esté en funcionamiento
  startServer();
  // Schedulers de email desactivados manualmente
  // iniciarScheduler();
});
