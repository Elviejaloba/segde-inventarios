import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAjusteSchema } from "@shared/schema";
import * as dropbox from "./dropbox";
import multer from "multer";
import { enviarRecordatoriosMuestreo, enviarReporteSemanal } from "./emailScheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Pre-initialize Dropbox token on startup
  dropbox.initializeDropbox();

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

  app.get('/api/ajustes/valorizado', async (req, res) => {
    try {
      const { sucursal, periodo, fechaDesde, fechaHasta } = req.query;
      const analisis = await storage.getAnalisisValorizado(
        sucursal as string, 
        periodo as string,
        fechaDesde as string,
        fechaHasta as string
      );
      res.json(analisis);
    } catch (error) {
      console.error('Error getting análisis valorizado:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Análisis valorizado con costo de reposición
  app.get('/api/ajustes/valorizado-costo', async (req, res) => {
    try {
      const { sucursal } = req.query;
      const analisis = await storage.getAnalisisValorizadoConCosto(sucursal as string);
      res.json(analisis);
    } catch (error) {
      console.error('Error getting análisis valorizado con costo:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/ajustes/punto-equilibrio', async (req, res) => {
    try {
      const { sucursal } = req.query;
      const data = await storage.getPuntoEquilibrio(sucursal as string);
      res.json(data);
    } catch (error) {
      console.error('Error getting punto equilibrio:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Resumen por unidad de medida
  app.get('/api/ajustes/por-unidad', async (req, res) => {
    try {
      const { sucursal, periodo } = req.query;
      const resumen = await storage.getAjustesPorUnidadMedida(sucursal as string, periodo as string);
      res.json(resumen);
    } catch (error) {
      console.error('Error getting ajustes por unidad:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Historial de ajustes por código
  app.get('/api/ajustes/historial/:codigo', async (req, res) => {
    try {
      const { codigo } = req.params;
      const { sucursal } = req.query;
      const historial = await storage.getHistorialAjustesCodigo(codigo, sucursal as string);
      res.json(historial);
    } catch (error) {
      console.error('Error getting historial ajustes:', error);
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
      // Invalidate cache so new file appears immediately
      dropbox.invalidateFileCache();
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

  // ========================================
  // BRIDGE SYNC ENDPOINTS (protegidos con API Key)
  // ========================================

  function verificarBridgeApiKey(req: Request, res: Response): boolean {
    const apiKey = (req.headers['x-bridge-api-key'] as string) || req.headers['authorization']?.replace('Bearer ', '');
    const expectedKey = process.env.BRIDGE_API_KEY;
    
    // Log más detallado para ver exactamente qué está llegando
    console.log(`[Auth] Intento de sync. API Key recibida: "${apiKey ? apiKey.substring(0, 5) + '...' : 'NULA'}"`);
    
    if (!expectedKey) {
      console.error('[Auth] ERROR: BRIDGE_API_KEY no está configurada en los secrets de Replit');
      res.status(500).json({ error: 'Configuración de servidor incompleta' });
      return false;
    }

    if (!apiKey || apiKey.trim() !== expectedKey.trim()) {
      console.log(`[Auth] API Key rechazada. Comparando: "${apiKey?.trim()}" vs "${expectedKey.trim()}"`);
      res.status(401).json({ error: 'API key inválida o faltante' });
      return false;
    }
    return true;
  }
  
  app.get('/sync-info', async (req: Request, res: Response) => {
    if (!verificarBridgeApiKey(req, res)) return;
    try {
      const syncInfo = await storage.getSyncInfo();
      res.json(syncInfo);
    } catch (error) {
      console.error('Error getting sync info:', error);
      res.status(500).json({ error: 'Failed to get sync info' });
    }
  });

  app.post('/sync', async (req: Request, res: Response) => {
    if (!verificarBridgeApiKey(req, res)) return;
    try {
      const { ajustes, costos, ventas, incremental } = req.body;
      const results: any = { success: true, timestamp: new Date().toISOString() };
      
      if (ajustes && Array.isArray(ajustes)) {
        const count = await storage.syncAjustes(ajustes, incremental !== false);
        results.ajustes = { synced: count };
      }
      
      if (costos && Array.isArray(costos)) {
        const count = await storage.syncCostos(costos, incremental !== false);
        results.costos = { synced: count };
      }
      
      if (ventas && Array.isArray(ventas)) {
        const count = await storage.syncVentas(ventas, incremental !== false);
        results.ventas = { synced: count };
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error syncing data:', error);
      res.status(500).json({ error: 'Failed to sync data' });
    }
  });

  // Endpoint para envío manual de recordatorios de muestreo
  app.post('/api/muestreo/enviar-recordatorios', async (req, res) => {
    try {
      console.log('[API] Enviando recordatorios de muestreo manualmente...');
      await enviarRecordatoriosMuestreo();
      res.json({ success: true, message: 'Recordatorios enviados' });
    } catch (error) {
      console.error('Error enviando recordatorios:', error);
      res.status(500).json({ error: 'Failed to send reminders' });
    }
  });

  // ========================================
  // BRIDGE-TRIGGERED EMAIL ENDPOINTS
  // (llamados desde el servicio Windows)
  // ========================================

  app.post('/api/bridge/reporte-semanal', async (req, res) => {
    if (!verificarBridgeApiKey(req, res)) return;
    try {
      console.log('[Bridge API] Reporte semanal solicitado desde servicio Windows');
      await enviarReporteSemanal(true);
      res.json({ success: true, message: 'Reporte semanal enviado' });
    } catch (error) {
      console.error('[Bridge API] Error enviando reporte semanal:', error);
      res.status(500).json({ error: 'Error al enviar reporte semanal' });
    }
  });

  app.post('/api/bridge/recordatorios-muestreo', async (req, res) => {
    if (!verificarBridgeApiKey(req, res)) return;
    try {
      console.log('[Bridge API] Recordatorios de muestreo solicitados desde servicio Windows');
      await enviarRecordatoriosMuestreo();
      res.json({ success: true, message: 'Recordatorios de muestreo enviados' });
    } catch (error) {
      console.error('[Bridge API] Error enviando recordatorios:', error);
      res.status(500).json({ error: 'Error al enviar recordatorios de muestreo' });
    }
  });

  app.get('/api/ultima-actualizacion', async (req, res) => {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const result = await sql`
        SELECT 
          (SELECT MAX("FechaMovimiento") FROM ajustes_sucursales)::text as ajustes_fecha,
          (SELECT MAX(updated_at) FROM costos_articulos)::text as costos_fecha,
          (SELECT MAX("Fecha") FROM ventas_sucursales)::text as ventas_fecha,
          (SELECT COUNT(*) FROM ajustes_sucursales)::text as ajustes_total,
          (SELECT COUNT(*) FROM costos_articulos)::text as costos_total,
          (SELECT COUNT(*) FROM ventas_sucursales)::text as ventas_total
      `;
      res.json(result[0]);
    } catch (error) {
      console.error('Error getting ultima actualizacion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Crear servidor HTTP
  const httpServer = createServer(app);

  return httpServer;
}