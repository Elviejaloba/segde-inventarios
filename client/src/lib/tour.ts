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
        title: 'Reportes Valorizados',
        description: 'Estás en la sección de análisis económico de ajustes de inventario.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Filtros',
        description: 'Usa los selectores para filtrar por sucursal, ordenar por valor o buscar artículos específicos.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Tarjetas de Resumen',
        description: 'Las 4 tarjetas muestran: Pérdida total valorizada, Ventas del período, Alertas críticas (>3% pérdida) y Total de artículos analizados.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Tabla de Detalle',
        description: 'Cada fila muestra un artículo con su código, cantidad de ajustes, pérdida valorizada, ventas y % de pérdida. Los artículos en rojo tienen pérdida crítica.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Acciones por Artículo',
        description: 'El ícono del ojo permite ver el historial completo de ajustes. El ícono de documento busca muestreos relacionados.',
        side: 'left',
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
