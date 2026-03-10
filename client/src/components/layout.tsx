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
            <h1 className="text-sm sm:text-xl font-bold hidden sm:block">
              Seguimiento de Muestreos
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button
                      variant={location === "/" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-home"
                      className="px-3"
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
                  <Link href="/reportes">
                    <Button
                      variant={location === "/reportes" ? "default" : "ghost"}
                      size="sm"
                      data-testid="nav-reportes"
                      className={`px-3 ${location !== "/reportes" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600" : ""}`}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Reportes
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
                      className="px-3"
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Muestreos
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
                    className="relative h-9 w-9"
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
                    className="h-9 w-9"
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

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          <Link href="/">
            <button
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                location === "/" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">Inicio</span>
            </button>
          </Link>
          <Link href="/reportes">
            <button
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                location === "/reportes" ? "text-primary" : "text-blue-600"
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[10px] font-medium">Reportes</span>
            </button>
          </Link>
          <Link href="/muestreos">
            <button
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                location === "/muestreos" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <FileUp className="h-5 w-5" />
              <span className="text-[10px] font-medium">Muestreos</span>
            </button>
          </Link>
          <button
            onClick={() => {
              const page = location === "/muestreos" ? "muestreos" : location === "/reportes" ? "reportes" : "home";
              startTour(page);
            }}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground relative"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">Ayuda</span>
            <span className="absolute top-1.5 right-3 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="text-[10px] font-medium">{theme === "dark" ? "Claro" : "Oscuro"}</span>
          </button>
        </div>
      </nav>

      <main className="container py-4 sm:py-8 mt-14 sm:mt-16 pb-20 sm:pb-8 px-2 sm:px-4">
        {children}
      </main>
      <ImportExcel isHidden={hideImport} />
    </div>
  );
}