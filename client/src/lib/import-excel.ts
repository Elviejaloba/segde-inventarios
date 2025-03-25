import * as XLSX from 'xlsx';
import { storage } from './storage';
import { SUCURSAL_MAPPING } from './store';

// Función para convertir número serial de Excel a fecha
function excelSerialDateToJSDate(serial: number): string {
  // Excel usa 1900 como año base, y tiene un error con el año bisiesto 1900
  // Ajustamos el offset para manejar esto
  const EXCEL_START_DATE = new Date(1899, 11, 30);
  const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

  // Convertir el número serial a milisegundos y sumar al inicio de Excel
  const date = new Date(EXCEL_START_DATE.getTime() + serial * MILLISECONDS_PER_DAY);

  // Formatear la fecha como DD/MM/YYYY
  const dia = date.getDate().toString().padStart(2, '0');
  const mes = (date.getMonth() + 1).toString().padStart(2, '0');
  const año = date.getFullYear();

  return `${dia}/${mes}/${año}`;
}

function formatearFecha(fechaStr: string | number): string {
  try {
    // Si es un número, tratar como número serial de Excel
    if (typeof fechaStr === 'number' || !isNaN(Number(fechaStr))) {
      const serial = Number(fechaStr);
      console.log('Convirtiendo número serial de Excel:', serial);
      const fechaFormateada = excelSerialDateToJSDate(serial);
      console.log('Fecha convertida:', fechaFormateada);
      return fechaFormateada;
    }

    // Si ya está en formato DD/MM/YYYY, devolverlo tal cual
    if (typeof fechaStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaStr)) {
      return fechaStr;
    }

    console.warn('Formato de fecha no reconocido:', fechaStr);
    return String(fechaStr);
  } catch (error) {
    console.error('Error al formatear fecha:', fechaStr, error);
    return String(fechaStr);
  }
}

export async function importExcelToFirebase(file: File) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Procesando', jsonData.length, 'registros de Excel');

    const ajustes = jsonData.map((row: any) => {
      const sucursalExcel = row['Sucursal']?.trim() || '';
      const sucursalFirebase = SUCURSAL_MAPPING[sucursalExcel] || sucursalExcel;

      // Formatear la fecha
      const fechaStr = row['Fecha movimiento'];
      console.log('Fecha original del Excel:', fechaStr);
      const fecha = fechaStr ? formatearFecha(fechaStr) : '';
      console.log('Fecha formateada:', fecha);

      return {
        nroComprobante: Number(row['Nro. comprobante']) || 0,
        fechaMovimiento: fecha,
        tipoMovimiento: row['Tipo de Movimiento'] || '',
        codArticulo: row['Cód. Artículo'] || '',
        articulo: row['Artículo'] || '',
        sucursal: sucursalFirebase,
        cantidad: Number(row['Cantidad']) || 0
      };
    });

    console.log('Datos transformados:', ajustes.length, 'registros válidos');
    console.log('Ejemplo de datos transformados:', {
      sucursal: ajustes[0]?.sucursal,
      fecha: ajustes[0]?.fechaMovimiento
    });

    await storage.updateAjustes(ajustes);
    return true;
  } catch (error) {
    console.error('Error al importar Excel:', error);
    throw new Error('Error al procesar el archivo Excel');
  }
}