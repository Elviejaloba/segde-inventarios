import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAjusteSchema } from "@shared/schema";
import * as dropbox from "./dropbox";
import multer from "multer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Rutas API básicas
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Rutas para ajustes
  app.get('/api/ajustes', async (req, res) => {
    try {
      const { sucursal } = req.query;
      const ajustes = await storage.getAjustes(sucursal as string);
      res.json(ajustes);
    } catch (error) {
      console.error('Error getting ajustes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/ajustes/sucursal/:sucursal', async (req, res) => {
    try {
      const { sucursal } = req.params;
      const ajustes = await storage.getAjustesBySucursal(sucursal);
      res.json(ajustes);
    } catch (error) {
      console.error('Error getting ajustes by sucursal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/ajustes/stats', async (req, res) => {
    try {
      const stats = await storage.getAjustesStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting ajustes stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/ajustes', async (req, res) => {
    try {
      const ajusteData = insertAjusteSchema.parse(req.body);
      const newAjuste = await storage.createAjuste(ajusteData);
      res.status(201).json(newAjuste);
    } catch (error) {
      console.error('Error creating ajuste:', error);
      res.status(400).json({ error: 'Invalid ajuste data' });
    }
  });

  // Dropbox muestreos routes
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  app.get('/api/muestreos', async (_req: Request, res: Response) => {
    try {
      const files = await dropbox.listFiles();
      res.json(files);
    } catch (error) {
      console.error('Error listing muestreos:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  app.post('/api/muestreos/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }
      const { sucursal } = req.body;
      const result = await dropbox.uploadFile(
        req.file.originalname,
        req.file.buffer,
        sucursal
      );
      res.json(result);
    } catch (error) {
      console.error('Error uploading muestreo:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  app.get('/api/muestreos/:id/link', async (req: Request, res: Response) => {
    try {
      const { path } = req.query;
      if (!path || typeof path !== 'string') {
        res.status(400).json({ error: 'Missing file path' });
        return;
      }
      const link = await dropbox.getFileLink(path);
      res.json({ link });
    } catch (error) {
      console.error('Error getting file link:', error);
      res.status(500).json({ error: 'Failed to get file link' });
    }
  });

  // Crear servidor HTTP
  const httpServer = createServer(app);

  return httpServer;
}