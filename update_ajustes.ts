import * as XLSX from 'xlsx';
import { storage } from './client/src/lib/storage';
import { SUCURSAL_MAPPING } from './client/src/lib/store';
import * as fs from 'fs';

// Misma función que se usa en el front para las fechas
function excelSerialDateToJSDate(serial: number): string {
  const EXCEL_START_DATE = new Date(1899, 11, 30);
  const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

  const date = new Date(EXCEL_START_DATE.getTime() + serial * MILLISECONDS_PER_DAY);

  const dia = date.getDate().toString().padStart(2, '0');
  const mes = (date.getMonth() + 1).toString().padStart(2, '0');
  const año = date.getFullYear();

  return `${dia}/${mes}/${año}`;
}

function formatearFecha(fechaStr: string | number): string {
  try {
    if (typeof fechaStr === 'number' || !isNaN(Number(fechaStr))) {
      const serial = Number(fechaStr);
      console.log('Convirtiendo número serial de Excel:', serial);
      const fechaFormateada = excelSerialDateToJSDate(serial);
      console.log('Fecha convertida:', fechaFormateada);
      return fechaFormateada;
    }

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

async function processExcelFile(filePath: string) {
  try {
    console.log(`Procesando archivo: ${filePath}`);
    
    // Leer el archivo
    const fileData = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileData);
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
    if (ajustes.length > 0) {
      console.log('Ejemplo de datos transformados:', {
        sucursal: ajustes[0]?.sucursal,
        fecha: ajustes[0]?.fechaMovimiento,
        comprobante: ajustes[0]?.nroComprobante
      });
    }

    // Actualizar en Firebase
    await storage.updateAjustes(ajustes);
    console.log('Datos actualizados exitosamente en Firebase');
    return true;
  } catch (error) {
    console.error('Error al procesar el archivo Excel:', error);
    throw new Error('Error al procesar el archivo Excel');
  }
}

// Ruta al archivo Excel
const filePath = './attached_assets/ajustes sucursales2025_1.xlsx';

// Ejecutar el proceso
processExcelFile(filePath)
  .then(() => {
    console.log('Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el proceso:', error);
    process.exit(1);
  });