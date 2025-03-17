import { ref, set, increment, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

interface EventData {
  timestamp?: any;
  count?: number;
  details?: Record<string, any>;
}

export const analytics = {
  // Registra un evento de vista de página
  logPageView: async (page: string) => {
    try {
      const pageViewRef = ref(db, `analytics/pageViews/${page}`);
      await set(pageViewRef, {
        lastView: serverTimestamp(),
        count: increment(1)
      });
    } catch (error) {
      console.error('Error logging page view:', error);
    }
  },

  // Registra un evento de acción del usuario
  logAction: async (action: string, details?: Record<string, any>) => {
    try {
      const actionRef = ref(db, `analytics/actions/${action}`);
      const eventData: EventData = {
        timestamp: serverTimestamp(),
        count: increment(1)
      };
      
      if (details) {
        eventData.details = details;
      }
      
      await set(actionRef, eventData);
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },

  // Registra tiempo de sesión
  logSessionDuration: async (durationInSeconds: number) => {
    try {
      const sessionRef = ref(db, 'analytics/sessions');
      await set(sessionRef, {
        lastSession: serverTimestamp(),
        duration: durationInSeconds,
        count: increment(1)
      });
    } catch (error) {
      console.error('Error logging session:', error);
    }
  }
};
