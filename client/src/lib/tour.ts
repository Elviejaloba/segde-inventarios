declare global {
  interface Window {
    driver: {
      js: {
        driver: (options: any) => any;
      };
    };
  }
}

const isMobile = () => window.innerWidth < 640;

export function startTour(page: 'home' | 'muestreos' | 'reportes') {
  if (typeof window.driver === 'undefined' || !window.driver.js) {
    console.error('Driver.js not loaded');
    return;
  }

  const navSide = isMobile() ? 'top' : 'bottom';
  const mobile = isMobile();

  const homeSteps = [
    ...(mobile ? [] : [
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
    ]),
    ...(mobile ? [
      {
        popover: {
          title: 'Bienvenido al Sistema',
          description: 'Este tour te guiará por las funciones principales. Usa la barra inferior para navegar entre Inicio, Reportes, Muestreos y más.',
          side: 'top',
          align: 'center'
        }
      },
    ] : []),
    {
      element: '[data-testid="indicadores-meses-ranking"]',
      popover: {
        title: 'Indicadores Mensuales',
        description: 'Estos badges muestran el progreso por mes. Verde = meta cumplida, azul = en progreso, gris = pendiente.',
        side: 'top',
        align: 'end'
      }
    },
    {
      element: mobile ? '[data-testid="select-branch-mobile"]' : '[data-testid="select-branch"]',
      popover: {
        title: 'Selector de Sucursal',
        description: mobile
          ? 'Toca aquí para elegir tu sucursal. Se abrirá una pantalla con todas las opciones para que selecciones fácilmente.'
          : 'Selecciona una sucursal para ver su checklist de artículos y marcar los que ya fueron revisados.',
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
        description: 'Cada tarjeta representa un mes con su objetivo de items a completar. Al llegar al objetivo, aparece confetti de celebración.',
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
        description: 'Escribe el código del artículo para encontrarlo rápidamente en la lista.',
        side: mobile ? 'bottom' : 'top',
        align: 'start'
      }
    },
    {
      element: '[data-testid="items-lista"]',
      popover: {
        title: 'Lista de Items',
        description: 'Toca cualquier item para marcarlo como completado. Si no hay stock, marca la casilla correspondiente.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '[data-testid="items-agregados"]',
      popover: {
        title: 'Items Agregados',
        description: 'Si encontrás artículos que no están en la lista pero creés conveniente muestrear, agregalos acá escribiendo el código. Quedan registrados por mes y se suman al progreso de la sucursal.',
        side: 'top',
        align: 'center'
      }
    }
  ];

  const reportesSteps = [
    {
      popover: {
        title: 'Bienvenido a Reportes',
        description: 'Aquí analizamos cuánto dinero representan los ajustes de inventario. Te guiaremos paso a paso.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '[data-testid="reportes-filtros"]',
      popover: {
        title: 'Filtros',
        description: 'Filtra por sucursal, período, y ordena por valor de pérdida o porcentaje. Usa el buscador para encontrar un artículo.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="kpi-perdida"]',
      popover: {
        title: 'Pérdida Total',
        description: 'Monto total en pesos de mercadería faltante. Se calcula multiplicando unidades faltantes por precio de venta.',
        side: mobile ? 'bottom' : 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="kpi-ventas"]',
      popover: {
        title: 'Ventas del Período',
        description: 'Lo que se vendió de estos artículos desde su último ajuste. Sirve para calcular el porcentaje de pérdida.',
        side: 'bottom',
        align: mobile ? 'start' : 'center'
      }
    },
    {
      element: '[data-testid="kpi-alertas"]',
      popover: {
        title: 'Alertas Críticas',
        description: 'Artículos con pérdida superior al 3% de sus ventas. Son los que necesitan atención urgente.',
        side: 'bottom',
        align: mobile ? 'end' : 'center'
      }
    },
    {
      element: '[data-testid="kpi-articulos"]',
      popover: {
        title: 'Artículos Analizados',
        description: 'Total de productos con algún ajuste registrado.',
        side: 'bottom',
        align: mobile ? 'end' : 'end'
      }
    },
    {
      element: '[data-testid="tabla-resumen"]',
      popover: {
        title: 'Resumen por Sucursal',
        description: 'Compara el rendimiento de cada sucursal. Toca una fila para filtrar y ver solo esa sucursal.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '[data-testid="btn-ver-costo"]',
      popover: {
        title: 'Ver a Costo de Reposición',
        description: 'Permite ver valores a costo de reposición. Requiere contraseña (uso exclusivo del Directorio).',
        side: mobile ? 'bottom' : 'left',
        align: 'center'
      }
    },
    {
      element: '[data-testid="tabla-detalle"]',
      popover: {
        title: 'Detalle de Ajustes',
        description: 'Toca para expandir y ver cada producto con sus ajustes. El botón del ojo muestra el historial completo.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Cómo Interpretar',
        description: 'Un % de pérdida alto (rojo) significa que un porcentaje importante se pierde. Ejemplo: 5% = de cada $100 vendidos, $5 se pierden. Priorizá los de mayor valor y mayor porcentaje.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: '¡Listo!',
        description: 'Enfocate primero en los artículos con alertas rojas (>3%) y con mayor valor de pérdida. Son los que más impactan al negocio.',
        side: 'top',
        align: 'center'
      }
    }
  ];

  const muestreosSteps = [
    {
      popover: {
        title: 'Subir Muestreos',
        description: 'Desde aquí puedes subir los archivos de muestreo de cada sucursal y ver los ya enviados.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '[data-testid="select-branch-muestreo"]',
      popover: {
        title: '1. Seleccionar Sucursal',
        description: 'Primero elegí la sucursal a la que corresponde el archivo de muestreo.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="button-select-file"]',
      popover: {
        title: '2. Elegir Archivo',
        description: 'Tocá aquí para seleccionar el archivo (Word, Excel, PDF o imagen).',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-testid="button-upload-muestreo"]',
      popover: {
        title: '3. Subir',
        description: 'Una vez seleccionados la sucursal y el archivo, tocá aquí para subirlo a Dropbox.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '[data-testid="select-filter-branch"]',
      popover: {
        title: 'Filtrar Archivos',
        description: 'Filtrá la lista de archivos por sucursal para encontrar lo que buscás.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      popover: {
        title: 'Ver Contenido del Archivo',
        description: 'Los archivos Word muestran un botón de lupa. Tocalo para ver los artículos que contiene el muestreo sin necesidad de abrir el archivo: código, descripción y diferencia.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Código del Archivo',
        description: 'Cada archivo muestra un badge amarillo con el código extraído del nombre. Así identificás rápido de qué artículo trata cada muestreo.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Estados de Archivos',
        description: 'Cada archivo tiene un estado (No visto, Visto, Analizado, Sin diferencias, Revisar). Tocá el badge de estado para cambiarlo.',
        side: 'top',
        align: 'center'
      }
    }
  ];

  const steps = page === 'home' ? homeSteps : page === 'reportes' ? reportesSteps : muestreosSteps;
  const validSteps = steps.filter(step => !(step as any).element || document.querySelector((step as any).element));
  
  if (validSteps.length === 0) {
    console.warn('No tour elements found on this page');
    return;
  }

  const driverObj = window.driver.js.driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayClickNext: false,
    stagePadding: mobile ? 2 : 4,
    stageRadius: 8,
    popoverClass: 'driverjs-theme',
    nextBtnText: mobile ? 'Siguiente ›' : 'Siguiente',
    prevBtnText: mobile ? '‹ Anterior' : 'Anterior',
    doneBtnText: 'Finalizar',
    progressText: '{{current}} de {{total}}',
    steps: validSteps
  });

  driverObj.drive();
}
