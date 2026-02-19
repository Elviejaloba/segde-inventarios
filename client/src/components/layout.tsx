import { useState, useEffect } from "react";
import { Moon, Sun, Home, Upload, BarChart3, FileUp, HelpCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportExcel } from "@/components/import-excel";
import { Link, useLocation } from "wouter";
import { startTour } from "@/lib/tour";

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
        <div className="container flex items-center justify-between h-14 sm:h-16 px-2 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <img 
              src="/assets/GRUPO CRISA.webp" 
              alt="GRUPO CRISA" 
              className="h-7 sm:h-10 w-auto"
              width="109"
              height="48"
            />
            <h1 className="text-sm sm:text-xl font-bold hidden xs:block">
              Seguimiento de Muestreos
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button
                      variant={location === "/" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-home"
                      className="px-2 sm:px-3"
                    >
                      <Home className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dashboard principal</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/reportes">
                    <Button
                      variant={location === "/reportes" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-reportes"
                      className={`px-2 sm:px-3 ${location !== "/reportes" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600" : ""}`}
                    >
                      <FileText className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Reportes</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver reportes de ajustes</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/muestreos">
                    <Button
                      variant={location === "/muestreos" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-muestreos"
                      className="px-2 sm:px-3"
                    >
                      <FileUp className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Muestreos</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Subir archivos de muestreo</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const page = location === "/muestreos" ? "muestreos" : location === "/reportes" ? "reportes" : "home";
                      startTour(page);
                    }}
                    data-testid="button-tour"
                    className="relative h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <HelpCircle className="h-4 w-4 animate-pulse" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tour guiado de ayuda</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="h-8 w-8 sm:h-9 sm:w-9"
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
      <main className="container py-4 sm:py-8 mt-16 px-2 sm:px-4">
        {children}
      </main>
      <ImportExcel isHidden={hideImport} />
    </div>
  );
}