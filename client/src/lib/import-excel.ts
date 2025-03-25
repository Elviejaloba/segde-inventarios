import * as XLSX from 'xlsx';
import { storage } from './storage';

export async function importExcelToFirebase(file: File) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Procesando', jsonData.length, 'registros de Excel');

    // Transformar datos al formato esperado, manteniendo los nombres exactos de las columnas
    const ajustes = jsonData.map((row: any) => ({
      nroComprobante: Number(row['Nro. comprobante']) || 0,
      fechaMovimiento: row['Fecha movimiento'] || '',
      tipoMovimiento: row['Tipo de Movimiento'] || '',
      codArticulo: row['Cód. Artículo'] || '',
      articulo: row['Artículo'] || '',
      sucursal: row['Sucursal']?.trim() || '', // Aseguramos que el nombre de la sucursal esté limpio
      cantidad: Number(row['Cantidad']) || 0
    }));

    console.log('Datos transformados:', ajustes.length, 'registros válidos');
    console.log('Ejemplo de sucursal:', ajustes[0]?.sucursal);

    // Cargar datos a Firebase
    await storage.updateAjustes(ajustes);
    console.log('Datos cargados exitosamente a Firebase');

    return true;
  } catch (error) {
    console.error('Error al importar Excel:', error);
    throw new Error('Error al procesar el archivo Excel');
  }
}