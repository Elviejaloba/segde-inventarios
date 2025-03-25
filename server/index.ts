import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';

const app = express();

// Configuración básica
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Logging middleware simplificado
app.use((req, res, next) => {
  const start = Date.now();
  log(`${req.method} ${req.url}`);
  next();
});

// Inicialización del servidor
(async () => {
  try {
    const server = app.listen(5000, '0.0.0.0', () => {
      log('Servidor iniciado en puerto 5000');
    });

    // Configurar Vite primero en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      log('Configurando Vite...');
      await setupVite(app, server);
    } else {
      log('Configurando archivos estáticos...');
      serveStatic(app);
    }

    // Registrar rutas después de Vite
    await registerRoutes(app);

    // Manejo de errores al final
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    });

  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
})();