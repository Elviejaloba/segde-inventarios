declare global {
  interface Window {
    driver: {
      js: {
        driver: (options: any) => any;
      };
    };
  }
}

export function startTour(page: 'home' | 'muestreos') {
  if (typeof window.driver === 'undefined' || !window.driver.js) {
    console.error('Driver.js not loaded');
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
  });

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
      element: '[data-testid="nav-muestreos"]',
      popover: {
        title: 'Subir Muestreos',
        description: 'En esta sección puedes subir los archivos de muestreo de cada sucursal a Dropbox.',
        side: 'bottom',
        align: 'center'
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

  const steps = page === 'home' ? homeSteps : muestreosSteps;
  
  const validSteps = steps.filter(step => document.querySelector(step.element));
  
  if (validSteps.length === 0) {
    console.warn('No tour elements found on this page');
    return;
  }

  driverObj.setSteps(validSteps);
  driverObj.drive();
}
