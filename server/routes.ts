import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAjusteSchema } from "@shared/schema";
import * as dropbox from "./dropbox";
import multer from "multer";
import { enviarRecordatoriosMuestreo, enviarReporteSemanal, enviarMailPrueba } from "./emailScheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Pre-initialize Dropbox token on startup
  dropbox.initializeDropbox();
  const SYNC_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
  const syncIdempotencyCache = new Map<string, { state: "processing" | "done"; expiresAt: number; response?: any }>();

  function cleanupSyncIdempotencyCache() {
    const now = Date.now();
    for (const [key, entry] of syncIdempotencyCache.entries()) {
      if (entry.expiresAt <= now) {
        syncIdempotencyCache.delete(key);
      }
    }
  }

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

  app.get('/api/muestreos/:id/contenido', async (req: Request, res: Response) => {
    try {
      const { path: filePath } = req.query;
      if (!filePath || typeof filePath !== 'string') {
        res.status(400).json({ error: 'Missing file path' });
        return;
      }

      const ext = filePath.toLowerCase().split('.').pop();
      if (!ext || !['doc', 'docx'].includes(ext)) {
        res.json({ codigos: [], texto: '', error: 'Solo se pueden analizar archivos Word (.doc/.docx)' });
        return;
      }

      const fileBuffer = await dropbox.downloadFile(filePath);
      let textoExtraido = '';

      if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        textoExtraido = result.value;
      } else if (ext === 'doc') {
        const WordExtractor = (await import('word-extractor')).default;
        const extractor = new WordExtractor();
        const doc = await extractor.extract(fileBuffer);
        textoExtraido = doc.getBody();
      }

      const sucursalMatch = filePath.match(/\[([^\]]+)\]/);
      const sucursal = sucursalMatch ? sucursalMatch[1] : undefined;

      const lines = textoExtraido.split('\n');
      const codigosExtraidos: { codigo: string; descripcion: string; cantidad?: string; saldo?: string; diferencia?: string }[] = [];

      const articuloFullRegex = /^\s*¦?\s*([A-Z]{2}[A-Z0-9][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s{2,}(.+?)(?:\s+([\d.,]+)\s+([\d.,]+)\s+([-\d.,]+))?\s*¦?\s*$/;
      const articuloNumFullRegex = /^\s*¦?\s*(\d{2}[A-Z][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s{2,}(.+?)(?:\s+([\d.,]+)\s+([\d.,]+)\s+([-\d.,]+))?\s*¦?\s*$/;
      const articuloSimpleRegex = /^\s*¦?\s*([A-Z]{2}[A-Z0-9][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s*¦?\s*$/;
      const articuloNumSimpleRegex = /^\s*¦?\s*(\d{2}[A-Z][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s*¦?\s*$/;

      const PREFIJO_DESC: Record<string, string> = {
        'TC': 'Cortes Listos',
        'TA': 'Tela Algodón',
        'TF': 'Tul/Fantasía',
        'TD': 'Cuerina/Decoración',
        'TV': 'Tela Varios',
        'TI': 'Tela Interior',
        'TM': 'Tela Mantelería',
        'BL': 'Blanco',
        'ME': 'Mercería',
        'OT': 'Otros',
        'PV': 'Prenda Vestir',
        'AR': 'Aromatizante',
        'CO': 'Complemento',
        'BO': 'Bolsa',
        'TO': 'Toalla',
        'SE': 'Servicio',
      };

      const skipWords = new Set(['LINEAS', 'COMPROBANTE', 'ESTADO', 'OBSERVACIONES', 'USUARIO', 'ARTICULO', 'DEPOSITO', 'FECHA', 'HORA', 'CANTIDAD', 'SALDO', 'DIFERENCIA', 'DESCRIPCION', 'TOTAL', 'AJUSTADO', 'TOMA', 'INVENTARIO', 'TOM', 'ORIGINAL', 'COPIA']);
      const skipPatterns = [/TOMA\s+DE\s+INVENTARIO/i, /TRASLADO\s+DE/i, /AJUSTE\s+DE/i, /REMITO/i];

      for (const line of lines) {
        if (skipPatterns.some(p => p.test(line))) continue;
        let matched = false;
        for (const regex of [articuloFullRegex, articuloNumFullRegex]) {
          const fullMatch = line.match(regex);
          if (fullMatch) {
            const codClean = fullMatch[1].trim();
            if (skipWords.has(codClean.toUpperCase()) || codClean.length < 4) break;
            codigosExtraidos.push({
              codigo: codClean,
              descripcion: fullMatch[2].trim().replace(/\s{2,}/g, ' '),
              cantidad: fullMatch[3]?.trim(),
              saldo: fullMatch[4]?.trim(),
              diferencia: fullMatch[5]?.trim(),
            });
            matched = true;
            break;
          }
        }
        if (matched) continue;
        for (const regex of [articuloSimpleRegex, articuloNumSimpleRegex]) {
          const simpleMatch = line.match(regex);
          if (simpleMatch) {
            const codigo = simpleMatch[1].trim();
            if (skipWords.has(codigo.toUpperCase()) || codigo.length < 4) break;
            const prefijo = codigo.substring(0, 2);
            codigosExtraidos.push({
              codigo,
              descripcion: PREFIJO_DESC[prefijo] || '',
            });
            break;
          }
        }
      }

      let comprobante: string | undefined;
      const compMatch = textoExtraido.match(/Comprobante\s*:\s*(\S+\s+\S+)/i);
      if (compMatch) comprobante = compMatch[1].trim();

      let observaciones: string | undefined;
      const obsMatch = textoExtraido.match(/Observaciones\s*:\s*([^\n¦]+)/i);
      if (obsMatch) observaciones = obsMatch[1].trim().replace(/\s{2,}/g, ' ').replace(/\s*DEPOSITO.*/, '');

      res.json({
        codigos: codigosExtraidos,
        totalCodigos: codigosExtraidos.length,
        comprobante,
        observaciones,
        sucursal,
        tipoArchivo: ext,
      });
    } catch (error) {
      console.error('Error parsing file content:', error);
      res.status(500).json({ error: 'Error al analizar el archivo' });
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
    const idempotencyKey = (req.headers['x-idempotency-key'] as string | undefined)?.trim();
    cleanupSyncIdempotencyCache();
    if (idempotencyKey) {
      const cached = syncIdempotencyCache.get(idempotencyKey);
      if (cached?.state === "done" && cached.response) {
        return res.json({ ...cached.response, duplicate: true, idempotencyKey });
      }
      if (cached?.state === "processing") {
        return res.status(409).json({ error: 'Sync already in progress for this idempotency key', idempotencyKey });
      }
      syncIdempotencyCache.set(idempotencyKey, {
        state: "processing",
        expiresAt: Date.now() + SYNC_IDEMPOTENCY_TTL_MS,
      });
    }

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

      if (idempotencyKey) {
        syncIdempotencyCache.set(idempotencyKey, {
          state: "done",
          expiresAt: Date.now() + SYNC_IDEMPOTENCY_TTL_MS,
          response: results,
        });
      }
      
      res.json(results);
    } catch (error) {
      if (idempotencyKey) {
        syncIdempotencyCache.delete(idempotencyKey);
      }
      console.error('Error syncing data:', error);
      res.status(500).json({ error: 'Failed to sync data' });
    }
  });

  // Endpoint de prueba: manda mail a un destinatario específico
  app.post('/api/muestreo/enviar-prueba', async (req, res) => {
    try {
      const { destinatario, sucursal } = req.body;
      if (!destinatario) return res.status(400).json({ error: 'destinatario requerido' });
      console.log(`[API] Enviando mail de prueba a ${destinatario}...`);
      const result = await enviarMailPrueba(destinatario, sucursal);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error enviando mail de prueba:', error);
      res.status(500).json({ error: error.message || 'Error al enviar' });
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
    // EMAILS DESACTIVADOS MANUALMENTE
    console.log('[Bridge API] Reporte semanal recibido pero EMAILS DESACTIVADOS - no se enviará nada');
    return res.json({ success: true, message: 'Emails desactivados - no se envió nada' });
  });

  app.post('/api/bridge/recordatorios-muestreo', async (req, res) => {
    if (!verificarBridgeApiKey(req, res)) return;
    // EMAILS DESACTIVADOS MANUALMENTE
    console.log('[Bridge API] Recordatorios recibidos pero EMAILS DESACTIVADOS - no se enviará nada');
    return res.json({ success: true, message: 'Emails desactivados - no se envió nada' });
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
