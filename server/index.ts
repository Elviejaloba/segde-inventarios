import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { iniciarScheduler } from "./emailScheduler";
import cors from 'cors';

const app = express();

// Configuración básica - Aumentar límite para sincronización
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cors());

// Logging middleware simplificado
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
    if (process.env.NODE_ENV !== 'production') {
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
const server = app.listen(5000, '0.0.0.0', () => {
  log('Servidor iniciado en puerto 5000');
  // Configurar todo después de que el servidor esté en funcionamiento
  startServer();
  // Iniciar scheduler de emails semanales
  iniciarScheduler();
});