import * as XLSX from 'xlsx';
import { storage } from './storage';
import { SUCURSAL_MAPPING } from './store';

// Función para convertir número serial de Excel a fecha
function excelSerialDateToJSDate(serial: number) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;  
  const date_info = new Date(utc_value * 1000);
  const dia = date_info.getDate().toString().padStart(2, '0');
  const mes = (date_info.getMonth() + 1).toString().padStart(2, '0');
  const año = date_info.getFullYear();

  return `${dia}/${mes}/${año}`;
}

function formatearFecha(fechaStr: string): string {
  try {
    // Si es un número, tratar como número serial de Excel
    if (!isNaN(Number(fechaStr))) {
      return excelSerialDateToJSDate(Number(fechaStr));
    }

    // Si ya está en formato DD/MM/YYYY, devolverlo tal cual
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaStr)) {
      return fechaStr;
    }

    // Para otros formatos, intentar convertir
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear();
      return `${dia}/${mes}/${año}`;
    }

    console.warn('No se pudo formatear la fecha:', fechaStr);
    return fechaStr;
  } catch (error) {
    console.error('Error al formatear fecha:', fechaStr, error);
    return fechaStr;
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
      const fecha = fechaStr ? formatearFecha(fechaStr) : '';

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