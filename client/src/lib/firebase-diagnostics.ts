import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, set, get, remove } from 'firebase/database';

interface DiagnosticResult {
  success: boolean;
  error?: string;
  details: {
    configPresent: boolean;
    networkConnected: boolean;
    readSuccess: boolean;
    writeSuccess: boolean;
    errorLogs: string[];
  };
}

export const runFirebaseDiagnostics = async (): Promise<DiagnosticResult> => {
  const result: DiagnosticResult = {
    success: false,
    details: {
      configPresent: false,
      networkConnected: false,
      readSuccess: false,
      writeSuccess: false,
      errorLogs: []
    }
  };

  try {
    // Verificar configuración
    result.details.configPresent = !!(
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID
    );

    if (!result.details.configPresent) {
      throw new Error("Falta configuración de Firebase");
    }

    // Probar lectura
    const testRef = ref(db, 'diagnostic-tests');
    await get(testRef);
    result.details.readSuccess = true;

    // Probar escritura
    const testDataRef = ref(db, 'diagnostic-tests/test-connection');
    await set(testDataRef, { 
      timestamp: new Date().toISOString(),
      status: 'test'
    });
    result.details.writeSuccess = true;
    await remove(testDataRef);

    result.details.networkConnected = true;
    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    result.error = errorMessage;
    result.details.errorLogs.push(errorMessage);
  }

  return result;
};