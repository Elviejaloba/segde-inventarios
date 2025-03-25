import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import cors from 'cors';

const app = express();

// Configuración básica
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Logging middleware simplificado
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

// Ruta de salud básica
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});


// Inicialización del servidor
const server = app.listen(5000, '0.0.0.0', () => {
  log('Servidor iniciado en puerto 5000');
});

// Configuración adicional después de que el servidor esté funcionando
(async () => {
  try {
    // Configurar Vite en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Registrar rutas después de Vite
    await registerRoutes(app);
  } catch (error) {
    console.error('Error de configuración:', error);
    process.exit(1);
  }
})();