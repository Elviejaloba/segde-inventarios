import { ref, get, set, getDatabase } from 'firebase/database';
import { app } from './firebase';
import { SEASON_CODES_TEMPORADA_VERANO } from './store';

// Función para sanitizar códigos
const sanitizeCode = (code: string) => {
  return code.toLowerCase().replace(/[/.#$[\]]/g, '-');
};

export async function cleanDuplicatesForBranch(branchId: string) {
  const database = getDatabase(app);
  const branchRef = ref(database, `ajustes/temporada-verano/${branchId}/items`);
  
  try {
    const snapshot = await get(branchRef);
    if (!snapshot.exists()) {
      console.log(`No data found for branch ${branchId}`);
      return;
    }

    const currentData = snapshot.val();
    const cleanedData: any = {};
    
    // Solo mantener códigos que están en la lista oficial
    SEASON_CODES_TEMPORADA_VERANO.forEach(code => {
      const sanitizedCode = sanitizeCode(code);
      
      // Buscar el item usando código original primero, luego sanitizado
      const existingItem = currentData[code] || currentData[sanitizedCode];
      
      if (existingItem) {
        // Guardar solo con código sanitizado para evitar duplicados
        cleanedData[sanitizedCode] = {
          completed: existingItem.completed || false,
          hasStock: existingItem.hasStock !== false, // Default true
          lastUpdated: existingItem.lastUpdated || Date.now()
        };
      } else {
        // Crear nuevo item si no existe
        cleanedData[sanitizedCode] = {
          completed: false,
          hasStock: true,
          lastUpdated: Date.now()
        };
      }
    });

    // Actualizar Firebase con datos limpios
    await set(branchRef, cleanedData);
    
    console.log(`✅ Limpieza completada para ${branchId}: ${Object.keys(cleanedData).length} códigos`);
    return cleanedData;
    
  } catch (error) {
    console.error(`Error limpiando datos para ${branchId}:`, error);
    throw error;
  }
}

export async function cleanAllBranches() {
  const branches = [
    'T.Mendoza', 'T.Sjuan', 'T.Luis', 'Crisa2', 
    'T.S.Martin', 'T.Tunuyan', 'T.Lujan', 'T.Maipu', 'T.Srafael'
  ];
  
  console.log('🧹 Iniciando limpieza de datos duplicados...');
  
  for (const branch of branches) {
    try {
      await cleanDuplicatesForBranch(branch);
    } catch (error) {
      console.error(`Error en ${branch}:`, error);
    }
  }
  
  console.log('✅ Limpieza de todas las sucursales completada');
}