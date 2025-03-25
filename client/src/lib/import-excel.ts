import * as XLSX from 'xlsx';
import { storage } from './storage';
import { SUCURSAL_MAPPING } from './store';

export async function importExcelToFirebase(file: File) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Procesando', jsonData.length, 'registros de Excel');

    // Transformar datos al formato esperado, manteniendo los nombres exactos de las columnas
    const ajustes = jsonData.map((row: any) => {
      const sucursalExcel = row['Sucursal']?.trim() || '';
      const sucursalFirebase = SUCURSAL_MAPPING[sucursalExcel] || sucursalExcel;

      // Formatear la fecha correctamente
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

    // Cargar datos a Firebase
    await storage.updateAjustes(ajustes);

    return true;
  } catch (error) {
    console.error('Error al importar Excel:', error);
    throw new Error('Error al procesar el archivo Excel');
  }
}

function formatearFecha(fechaStr: string): string {
  try {
    // Verificar si la fecha ya está en formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaStr)) {
      return fechaStr;
    }

    // Si es un número de serie de Excel, convertirlo
    if (!isNaN(Number(fechaStr))) {
      const date = XLSX.SSF.parse_date_code(Number(fechaStr));
      return `${date.d.toString().padStart(2, '0')}/${date.m.toString().padStart(2, '0')}/${date.y}`;
    }

    // Intentar parsear como fecha normal
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    return fechaStr;
  } catch (error) {
    console.error('Error al formatear fecha:', fechaStr, error);
    return fechaStr;
  }
}