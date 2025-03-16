import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, enableNetwork, disableNetwork } from 'firebase/firestore';

interface DiagnosticResult {
  success: boolean;
  error?: string;
  details: {
    configPresent: boolean;
    networkConnected: boolean;
    readSuccess: boolean;
    writeSuccess: boolean;
    reconnectionSuccess: boolean;
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
      reconnectionSuccess: false,
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

    // Probar reconexión
    await disableNetwork(db);
    await enableNetwork(db);
    result.details.reconnectionSuccess = true;

    // Probar lectura
    const testCollection = collection(db, 'diagnostic-tests');
    await getDocs(testCollection);
    result.details.readSuccess = true;

    // Probar escritura
    const testDoc = doc(testCollection, 'test-connection');
    await setDoc(testDoc, { 
      timestamp: new Date().toISOString(),
      status: 'test'
    });
    result.details.writeSuccess = true;
    await deleteDoc(testDoc);

    result.details.networkConnected = true;
    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    result.error = errorMessage;
    result.details.errorLogs.push(errorMessage);
  }

  return result;
};