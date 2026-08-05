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
        <div className="container flex min-h-14 items-center justify-between gap-2 px-3 py-2 sm:h-16 sm:px-4 sm:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-4">
            <img 
              src="/assets/GRUPO CRISA.webp" 
              alt="GRUPO CRISA" 
              className="h-7 sm:h-10 w-auto"
              width="109"
              height="48"
            />
            <h1 className="line-clamp-2 text-xs font-bold leading-tight sm:line-clamp-1 sm:text-xl">
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur safe-area-bottom">
        <div className="flex h-16 items-center justify-between gap-1 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <Link href="/">
            <button
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${
                location === "/" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="truncate text-[10px] font-medium leading-tight">Inicio</span>
            </button>
          </Link>
          <Link href="/reportes">
            <button
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${
                location === "/reportes" ? "text-primary" : "text-blue-600"
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="truncate text-[10px] font-medium leading-tight">Reportes</span>
            </button>
          </Link>
          <Link href="/muestreos">
            <button
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${
                location === "/muestreos" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <FileUp className="h-5 w-5" />
              <span className="truncate text-[10px] font-medium leading-tight">Muestreos</span>
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
            <span className="truncate text-[10px] font-medium leading-tight">Ayuda</span>
            <span className="absolute top-1.5 right-3 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="truncate text-[10px] font-medium leading-tight">{theme === "dark" ? "Claro" : "Oscuro"}</span>
          </button>
        </div>
      </nav>

      <main className="container mt-16 max-w-screen-2xl px-3 py-3 pb-24 sm:mt-16 sm:px-4 sm:py-8 sm:pb-8">
        {children}
      </main>
      <ImportExcel isHidden={hideImport} />
    </div>
  );
}