declare global {
  interface Window {
    driver: {
      js: {
        driver: (options: any) => any;
      };
    };
  }
}

export function startTour(page: 'home' | 'muestreos' | 'reportes') {
  if (typeof window.driver === 'undefined' || !window.driver.js) {
    console.error('Driver.js not loaded');
    return;
  }

  const homeSteps = [
    {
      element: '[data-testid="nav-home"]',
      popover: {
        title: 'Dashboard Principal',
        description: 'Aquí puedes ver el ranking de sucursales y su progreso en los muestreos.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="nav-reportes"]',
      popover: {
        title: 'Reportes Valorizados',
        description: 'Aquí puedes ver el análisis económico de los ajustes de inventario por sucursal.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="nav-muestreos"]',
      popover: {
        title: 'Subir Muestreos',
        description: 'En esta sección puedes subir los archivos de muestreo de cada sucursal.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="button-ranking"]',
      popover: {
        title: 'Ranking de Sucursales',
        description: 'Muestra la tabla de posiciones con el progreso de cada sucursal ordenado por avance.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="indicadores-meses-ranking"]',
      popover: {
        title: 'Indicadores Mensuales',
        description: 'Estos badges muestran el progreso por mes de cada sucursal. Verde = meta cumplida, azul = en progreso.',
        side: 'top',
        align: 'end'
      }
    },
    {
      element: '[data-testid="select-branch"]',
      popover: {
        title: 'Selector de Sucursal',
        description: 'Selecciona una sucursal para ver su checklist de artículos y marcar los que ya fueron revisados.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="header-calendario"]',
      popover: {
        title: 'Artículos Sin Rotación',
        description: 'Esta sección muestra los artículos con sobrestock o sin rotación que debes revisar. La cantidad varía por sucursal.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="objetivos-mensuales"]',
      popover: {
        title: 'Objetivos Mensuales',
        description: 'Cada tarjeta representa un mes con su objetivo de items a completar. Cuando llegas al objetivo, aparece confetti de celebración.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="progreso-total"]',
      popover: {
        title: 'Progreso Total',
        description: 'Aquí ves cuántos items has completado del total de la sucursal.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '[data-testid="buscador-items"]',
      popover: {
        title: 'Buscador Rápido',
        description: 'Escribe el código del artículo para encontrarlo rápidamente.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '[data-testid="items-lista"]',
      popover: {
        title: 'Lista de Items',
        description: 'Haz clic en cualquier item para marcarlo como completado.',
        side: 'top',
        align: 'center'
      }
    }
  ];

  const reportesSteps = [
    {
      element: '[data-testid="nav-reportes"]',
      popover: {
        title: 'Bienvenido a Reportes Valorizados',
        description: 'Aquí analizamos cuánto dinero representa cada ajuste de inventario. Te guiaremos paso a paso para que entiendas cómo interpretar esta información.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="reportes-filtros"]',
      popover: {
        title: 'Filtros de Búsqueda',
        description: 'Selecciona una sucursal específica o déjalo en "Todas" para ver el consolidado. Puedes ordenar por mayor valor de pérdida, mayor porcentaje o más unidades. El buscador te ayuda a encontrar un artículo específico por código.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="kpi-perdida"]',
      popover: {
        title: 'Pérdida Total Valorizada',
        description: 'Este es el monto total en pesos de mercadería faltante. Se calcula multiplicando las unidades faltantes por su precio de venta. Un número alto aquí indica que hay mucho dinero "perdido" en ajustes.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="kpi-ventas"]',
      popover: {
        title: 'Total Ventas del Período',
        description: 'Este monto representa lo que se vendió de estos mismos artículos desde su último ajuste. Lo usamos para calcular el porcentaje de pérdida: dividimos la pérdida entre las ventas.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="kpi-alertas"]',
      popover: {
        title: 'Alertas Críticas (más del 3%)',
        description: 'Estos son los artículos con pérdida superior al 3% de sus ventas. Son los que necesitan atención urgente porque representan un problema significativo. Aparecen resaltados en rojo en la tabla.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '[data-testid="kpi-articulos"]',
      popover: {
        title: 'Artículos Analizados',
        description: 'El total de códigos de productos que tienen algún ajuste registrado. Este número te da una idea de la magnitud del análisis.',
        side: 'bottom',
        align: 'end'
      }
    },
    {
      element: '[data-testid="tabla-resumen"]',
      popover: {
        title: 'Resumen por Sucursal',
        description: 'Esta tabla compara el rendimiento de cada sucursal. Puedes ver cuántos artículos tienen ajustes, la pérdida total y el porcentaje. Haz clic en una fila para filtrar y ver solo esa sucursal.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '[data-testid="tabla-detalle"]',
      popover: {
        title: 'Detalle de Cada Artículo',
        description: 'Aquí ves cada producto con ajustes. Las columnas Dif.2025 (naranja) y Dif.2026 (azul) muestran las unidades faltantes por año. "Pérdida $" es el valor en pesos. "% Pérdida" es la fórmula: (Pérdida ÷ Ventas del período) × 100, con máximo 100%.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Cómo Interpretar los Datos',
        description: 'Un % de pérdida alto (rojo parpadeante) significa que de lo que se vende, un porcentaje importante se pierde. Por ejemplo: 5% significa que de cada $100 vendidos, $5 se pierden en ajustes. Prioriza investigar los de mayor valor y mayor porcentaje.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Acciones Disponibles',
        description: 'El botón del ojo te muestra el historial completo de ajustes de ese artículo para ver su evolución. El botón de documento busca los muestreos relacionados para que puedas revisar la evidencia física.',
        side: 'left',
        align: 'center'
      }
    },
    {
      popover: {
        title: '¡Listo para Analizar!',
        description: 'Ya conoces todas las herramientas. Recuerda: enfócate primero en los artículos con alertas rojas (>3%) y con mayor valor de pérdida. Estos son los que más impactan al negocio.',
        side: 'top',
        align: 'center'
      }
    }
  ];

  const muestreosSteps = [
    {
      element: '[data-testid="select-branch-muestreo"]',
      popover: {
        title: 'Seleccionar Sucursal',
        description: 'Primero selecciona la sucursal a la que corresponde el archivo de muestreo.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="button-select-file"]',
      popover: {
        title: 'Seleccionar Archivo',
        description: 'Haz clic aquí para elegir el archivo de muestreo (Word, Excel, PDF o imagen).',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="button-upload-muestreo"]',
      popover: {
        title: 'Subir Archivo',
        description: 'Una vez seleccionado el archivo y la sucursal, haz clic aquí para subirlo a Dropbox.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '[data-testid="select-filter-branch"]',
      popover: {
        title: 'Filtrar por Sucursal',
        description: 'Puedes filtrar la lista de archivos por sucursal para encontrar más fácilmente lo que buscas.',
        side: 'bottom',
        align: 'start'
      }
    }
  ];

  const steps = page === 'home' ? homeSteps : page === 'reportes' ? reportesSteps : muestreosSteps;
  const validSteps = steps.filter(step => !step.element || document.querySelector(step.element));
  
  if (validSteps.length === 0) {
    console.warn('No tour elements found on this page');
    return;
  }

  const driverObj = window.driver.js.driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayClickNext: false,
    stagePadding: 4,
    popoverClass: 'driverjs-theme',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Finalizar',
    progressText: '{{current}} de {{total}}',
    steps: validSteps
  });

  driverObj.drive();
}
