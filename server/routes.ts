import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAjusteSchema, checklistAddedItemInputSchema, checklistBranchPatchSchema, checklistSingleItemUpdateSchema, muestreoFileStatusUpdateSchema, telaRindeAuthSchema, telaRindeUpsertSchema, rindeInventorySessionCreateSchema, rindeInventoryItemUpsertSchema } from "@shared/schema";
import * as dropbox from './dropbox';
import { addChecklistItem, deleteChecklistAddedItem, getChecklistBranch, getChecklistBranches, getChecklistRanking, primeChecklistRuntime, updateChecklistBranch, updateChecklistItem } from './checklistStorage';
import multer from "multer";
import { enviarRecordatoriosMuestreo, enviarReporteSemanal, enviarMailPrueba } from "./emailScheduler";
import { pool } from "./db";

const hasValidRindePassword = (password: string | undefined) => {
  const expected = process.env.RINDE_CDD_PASSWORD;
  if (!expected) return false;
  return password === expected;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Pre-initialize Dropbox token on startup
  dropbox.initializeDropbox();

  // Rutas API bÃƒÆ’Ã‚Â¡sicas
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/api/rinde-articulos', async (req, res) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      const articles = await storage.searchRindeArticles(query);
      res.json(articles);
    } catch (error) {
      console.error('Error searching rinde articles:', error);
      res.status(500).json({ error: 'No se pudo buscar artículos.' });
    }
  });

  app.get('/api/rindes', async (_req, res) => {
    try {
      const includeInactive = _req.query.includeInactive === '1' || _req.query.includeInactive === 'true';
      const items = await storage.getActiveTelaRindes({ includeInactive });
      res.json(items);
    } catch (error) {
      console.error('Error listing active tela rindes:', error);
      res.status(500).json({ error: 'No se pudo listar los rindes activos.' });
    }
  });

  app.get('/api/rindes/:articleCode', async (req, res) => {
    try {
      const data = await storage.getTelaRinde(req.params.articleCode);
      if (!data) {
        res.status(404).json({ error: 'Artículo no encontrado.' });
        return;
      }
      res.json(data);
    } catch (error) {
      console.error('Error getting tela rinde:', error);
      res.status(500).json({ error: 'No se pudo cargar el rinde del artículo.' });
    }
  });

  app.post('/api/rindes/auth', async (req, res) => {
    try {
      const payload = telaRindeAuthSchema.parse(req.body);
      if (!process.env.RINDE_CDD_PASSWORD) {
        res.status(503).json({ error: 'La validación de rindes no está configurada.' });
        return;
      }
      if (!hasValidRindePassword(payload.password)) {
        res.status(401).json({ error: 'Contraseña incorrecta.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Error validating rinde password:', error);
      res.status(400).json({ error: 'No se pudo validar la contraseña.' });
    }
  });

  app.post('/api/rindes', async (req, res) => {
    try {
      if (!hasValidRindePassword(req.header('x-rinde-password') || undefined)) {
        res.status(401).json({ error: 'No autorizado.' });
        return;
      }
      const payload = telaRindeUpsertSchema.parse(req.body);
      const saved = await storage.saveTelaRinde(payload);
      res.status(201).json(saved);
    } catch (error) {
      console.error('Error creating tela rinde:', error);
      res.status(400).json({ error: 'No se pudo guardar el rinde.' });
    }
  });

  app.patch('/api/rindes/:articleCode', async (req, res) => {
    try {
      if (!hasValidRindePassword(req.header('x-rinde-password') || undefined)) {
        res.status(401).json({ error: 'No autorizado.' });
        return;
      }
      const payload = telaRindeUpsertSchema.parse({ ...req.body, articleCode: req.params.articleCode });
      const saved = await storage.saveTelaRinde(payload);
      res.json(saved);
    } catch (error) {
      console.error('Error updating tela rinde:', error);
      res.status(400).json({ error: 'No se pudo actualizar el rinde.' });
    }
  });

  app.post('/api/rinde-inventory/sessions', async (req, res) => {
    try {
      const payload = rindeInventorySessionCreateSchema.parse(req.body);
      const session = await storage.createRindeInventorySession(payload);
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating rinde inventory session:', error);
      res.status(400).json({ error: 'No se pudo iniciar el inventario.' });
    }
  });

  app.get('/api/rinde-inventory/sessions/:sessionId', async (req, res) => {
    try {
      const session = await storage.getRindeInventorySession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ error: 'Inventario no encontrado.' });
        return;
      }
      res.json(session);
    } catch (error) {
      console.error('Error getting rinde inventory session:', error);
      res.status(500).json({ error: 'No se pudo cargar el inventario.' });
    }
  });

  app.post('/api/rinde-inventory/sessions/:sessionId/items', async (req, res) => {
    try {
      const payload = rindeInventoryItemUpsertSchema.parse(req.body);
      const session = await storage.createRindeInventoryItem(req.params.sessionId, payload);
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating rinde inventory item:', error);
      res.status(400).json({ error: 'No se pudo agregar la fila al inventario.' });
    }
  });

  app.patch('/api/rinde-inventory/sessions/:sessionId/items/:itemId', async (req, res) => {
    try {
      const payload = rindeInventoryItemUpsertSchema.parse(req.body);
      const itemId = Number(req.params.itemId);
      const session = await storage.updateRindeInventoryItem(req.params.sessionId, itemId, payload);
      res.json(session);
    } catch (error) {
      console.error('Error updating rinde inventory item:', error);
      res.status(400).json({ error: 'No se pudo actualizar la fila del inventario.' });
    }
  });

  app.delete('/api/rinde-inventory/sessions/:sessionId/items/:itemId', async (req, res) => {
    try {
      const itemId = Number(req.params.itemId);
      const session = await storage.deleteRindeInventoryItem(req.params.sessionId, itemId);
      res.json(session);
    } catch (error) {
      console.error('Error deleting rinde inventory item:', error);
      res.status(400).json({ error: 'No se pudo eliminar la fila del inventario.' });
    }
  });

  app.post('/api/rinde-inventory/sessions/:sessionId/finalize', async (req, res) => {
    try {
      const session = await storage.finalizeRindeInventorySession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ error: 'Inventario no encontrado.' });
        return;
      }
      res.json(session);
    } catch (error) {
      console.error('Error finalizing rinde inventory session:', error);
      res.status(400).json({ error: 'No se pudo finalizar el inventario.' });
    }
  });

  app.get('/api/checklist/branches', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const branches = await getChecklistBranches({ period });
      res.json(branches);
    } catch (error) {
      console.error('Error getting checklist branches:', error);
      res.status(500).json({ error: 'Failed to load checklist branches' });
    }
  });

  app.get('/api/checklist/branches/:branchId', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const branch = await getChecklistBranch(req.params.branchId, { period });
      if (!branch) {
        res.status(404).json({ error: 'Branch not found' });
        return;
      }
      res.json(branch);
    } catch (error) {
      console.error('Error getting checklist branch:', error);
      res.status(500).json({ error: 'Failed to load checklist branch' });
    }
  });

  app.get('/api/checklist/:branchId', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const branch = await getChecklistBranch(req.params.branchId, { period });
      if (!branch) {
        res.status(404).json({ error: 'Branch not found' });
        return;
      }
      res.json(branch);
    } catch (error) {
      console.error('Error getting checklist branch:', error);
      res.status(500).json({ error: 'Failed to load checklist branch' });
    }
  });

  app.patch('/api/checklist/branches/:branchId', async (req, res) => {
    try {
      const patch = checklistBranchPatchSchema.parse(req.body);
      const branch = await updateChecklistBranch(req.params.branchId, patch);
      res.json(branch);
    } catch (error) {
      console.error('Error updating checklist branch:', error);
      res.status(400).json({ error: 'Failed to update checklist branch' });
    }
  });

  app.patch('/api/checklist/:branchId/items/:code', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const payload = checklistSingleItemUpdateSchema.parse({
        ...req.body,
        period: req.body?.period ?? period,
      });
      const branch = await updateChecklistItem(req.params.branchId, req.params.code, payload);
      res.json(branch);
    } catch (error) {
      console.error('Error updating checklist item:', error);
      res.status(400).json({ error: 'Failed to update checklist item' });
    }
  });

  app.post('/api/checklist/:branchId/added-items', async (req, res) => {
    try {
      const payload = checklistAddedItemInputSchema.parse(req.body);
      const branch = await addChecklistItem(req.params.branchId, payload);
      res.status(201).json(branch);
    } catch (error) {
      console.error('Error adding checklist item:', error);
      res.status(400).json({ error: 'Failed to add checklist item' });
    }
  });

  app.delete('/api/checklist/:branchId/added-items/:code', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : (typeof req.query.month === 'string' ? req.query.month : undefined);
      const branch = await deleteChecklistAddedItem(req.params.branchId, req.params.code, period);
      res.json(branch);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      res.status(400).json({ error: 'Failed to delete checklist item' });
    }
  });

  app.get('/api/ranking', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const ranking = await getChecklistRanking(period);
      res.json(ranking);
    } catch (error) {
      console.error('Error getting checklist ranking:', error);
      res.status(500).json({ error: 'Failed to load checklist ranking' });
    }
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
      console.error('Error getting anÃƒÆ’Ã‚Â¡lisis valorizado:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // AnÃƒÆ’Ã‚Â¡lisis valorizado con costo de reposiciÃƒÆ’Ã‚Â³n
  app.get('/api/ajustes/valorizado-costo', async (req, res) => {
    try {
      const { sucursal } = req.query;
      const analisis = await storage.getAnalisisValorizadoConCosto(sucursal as string);
      res.json(analisis);
    } catch (error) {
      console.error('Error getting anÃƒÆ’Ã‚Â¡lisis valorizado con costo:', error);
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

  // Historial de ajustes por cÃƒÆ’Ã‚Â³digo
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

  app.get('/api/muestreos/statuses', async (_req: Request, res: Response) => {
    try {
      const statuses = await storage.getMuestreosFileStatuses();
      res.json(statuses);
    } catch (error) {
      console.error('Error getting muestreos statuses:', error);
      res.status(500).json({ error: 'Failed to load file statuses' });
    }
  });

  app.patch('/api/muestreos/:id/status', async (req: Request, res: Response) => {
    try {
      const payload = muestreoFileStatusUpdateSchema.parse(req.body);
      const statusRecord = await storage.upsertMuestreoFileStatus(req.params.id, {
        filePath: payload.path ?? null,
        status: payload.status,
        updatedBy: payload.updatedBy ?? null,
      });
      res.json(statusRecord);
    } catch (error) {
      console.error('Error updating muestreos status:', error);
      res.status(400).json({ error: 'Failed to update file status' });
    }
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

      const articuloFullRegex = /^\s*Ãƒâ€šÃ‚Â¦?\s*([A-Z]{2}[A-Z0-9][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s{2,}(.+?)(?:\s+([\d.,]+)\s+([\d.,]+)\s+([-\d.,]+))?\s*Ãƒâ€šÃ‚Â¦?\s*$/;
      const articuloNumFullRegex = /^\s*Ãƒâ€šÃ‚Â¦?\s*(\d{2}[A-Z][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s{2,}(.+?)(?:\s+([\d.,]+)\s+([\d.,]+)\s+([-\d.,]+))?\s*Ãƒâ€šÃ‚Â¦?\s*$/;
      const articuloSimpleRegex = /^\s*Ãƒâ€šÃ‚Â¦?\s*([A-Z]{2}[A-Z0-9][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s*Ãƒâ€šÃ‚Â¦?\s*$/;
      const articuloNumSimpleRegex = /^\s*Ãƒâ€šÃ‚Â¦?\s*(\d{2}[A-Z][A-Z0-9\s\-.]{2,}?[A-Z0-9])\s*Ãƒâ€šÃ‚Â¦?\s*$/;

      const PREFIJO_DESC: Record<string, string> = {
        'TC': 'Cortes Listos',
        'TA': 'Tela AlgodÃƒÆ’Ã‚Â³n',
        'TF': 'Tul/FantasÃƒÆ’Ã‚Â­a',
        'TD': 'Cuerina/DecoraciÃƒÆ’Ã‚Â³n',
        'TV': 'Tela Varios',
        'TI': 'Tela Interior',
        'TM': 'Tela MantelerÃƒÆ’Ã‚Â­a',
        'BL': 'Blanco',
        'ME': 'MercerÃƒÆ’Ã‚Â­a',
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
      const obsMatch = textoExtraido.match(/Observaciones\s*:\s*([^\nÃƒâ€šÃ‚Â¦]+)/i);
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
    
    // Log mÃƒÆ’Ã‚Â¡s detallado para ver exactamente quÃƒÆ’Ã‚Â© estÃƒÆ’Ã‚Â¡ llegando
    console.log(`[Auth] Intento de sync. API Key recibida: "${apiKey ? apiKey.substring(0, 5) + '...' : 'NULA'}"`);
    
    if (!expectedKey) {
      console.error('[Auth] ERROR: BRIDGE_API_KEY no estÃƒÆ’Ã‚Â¡ configurada en los secrets de Replit');
      res.status(500).json({ error: 'ConfiguraciÃƒÆ’Ã‚Â³n de servidor incompleta' });
      return false;
    }

    if (!apiKey || apiKey.trim() !== expectedKey.trim()) {
      console.log(`[Auth] API Key rechazada. Comparando: "${apiKey?.trim()}" vs "${expectedKey.trim()}"`);
      res.status(401).json({ error: 'API key invÃƒÆ’Ã‚Â¡lida o faltante' });
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

  // Endpoint de prueba: manda mail a un destinatario especÃƒÆ’Ã‚Â­fico
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

  // Endpoint para envÃƒÆ’Ã‚Â­o manual de recordatorios de muestreo
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
    console.log('[Bridge API] Reporte semanal recibido pero EMAILS DESACTIVADOS - no se enviarÃƒÆ’Ã‚Â¡ nada');
    return res.json({ success: true, message: 'Emails desactivados - no se enviÃƒÆ’Ã‚Â³ nada' });
  });

  app.post('/api/bridge/recordatorios-muestreo', async (req, res) => {
    if (!verificarBridgeApiKey(req, res)) return;
    // EMAILS DESACTIVADOS MANUALMENTE
    console.log('[Bridge API] Recordatorios recibidos pero EMAILS DESACTIVADOS - no se enviarÃƒÆ’Ã‚Â¡ nada');
    return res.json({ success: true, message: 'Emails desactivados - no se enviÃƒÆ’Ã‚Â³ nada' });
  });

  app.get('/api/ultima-actualizacion', async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.json({
          ajustes_fecha: null,
          costos_fecha: null,
          ventas_fecha: null,
          ajustes_total: "0",
          costos_total: "0",
          ventas_total: "0",
        });
      }

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
