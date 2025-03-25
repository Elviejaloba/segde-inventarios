import * as XLSX from 'xlsx';
import { storage } from './storage';

export async function importExcelToFirebase(file: File) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Transformar datos al formato esperado
    const ajustes = jsonData.map((row: any) => ({
      tipo: row['Tipo'] || '',
      comprobante: row['Comprobante'] || '',
      nroComprobante: Number(row['Nro. comprobante']) || 0,
      fechaMovimiento: row['Fecha movimiento'] || '',
      tipoMovimiento: row['Tipo de Movimiento'] || '',
      codArticulo: row['Cód. Artículo'] || '',
      articulo: row['Artículo'] || '',
      sucursal: row['Sucursal'] || '',
      codClasificacion: Number(row['Cód. clasificación']) || null,
      cantidad: Number(row['Cantidad']) || 0,
      cantidadDevuelta: Number(row['Cantidad devuelta']) || 0,
      precioVenta: Number(row['Precio de venta']) || 0,
      stock1: Number(row['Stock 1']) || 0,
      cantidad2: Number(row['Cantidad 2']) || 0,
      cantidad2Devuelta: Number(row['Cantidad 2 devuelta']) || 0,
    }));

    await storage.importAjustesData(ajustes);
    return true;
  } catch (error) {
    console.error('Error al importar Excel:', error);
    throw new Error('Error al procesar el archivo Excel');
  }
}
