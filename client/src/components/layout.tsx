import { useState, useEffect } from "react";
import { Moon, Sun, Home, Upload, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportExcel } from "@/components/import-excel";
import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
  hideImport?: boolean;
  hideBranchSelector?: boolean;
}

export function Layout({ children, hideImport = false, hideBranchSelector = false }: LayoutProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b fixed top-0 left-0 right-0 bg-background z-50">
        <div className="container flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 py-2 sm:py-0">
          <div className="flex items-center gap-4 mb-2 sm:mb-0">
            <img 
              src="/assets/GRUPO CRISA.jpeg" 
              alt="GRUPO CRISA" 
              className="h-8 sm:h-10 w-auto"
            />
            <h1 className="text-lg sm:text-xl font-bold text-center sm:text-left">
              Seguimiento de Muestreos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button
                      variant={location === "/" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-home"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dashboard principal</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/importacion-inventario">
                    <Button
                      variant={location === "/importacion-inventario" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-importacion"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Suba de Inventario
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Importación de Toma de Inventario</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/consolidado">
                    <Button
                      variant={location === "/consolidado" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-consolidado"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Consolidado
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Consolidado Multi-Sucursal</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>
      <main className="container py-8 mt-20 sm:mt-16">
        {children}
      </main>
      <ImportExcel isHidden={hideImport} />
    </div>
  );
}