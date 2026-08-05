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
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
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
                      className={`px-3 ${location !== "/reportes" ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm hover:from-violet-600 hover:to-indigo-600" : ""}`}
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

      <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-background/96 shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.28)] backdrop-blur sm:hidden">
        <div className="grid h-[4.5rem] grid-cols-5 items-center gap-1 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
          <Link href="/">
            <button
              className={`flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 transition-all ${
                location === "/" ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Home className="h-[18px] w-[18px]" />
              <span className="truncate text-[10px] font-medium leading-tight">Inicio</span>
            </button>
          </Link>
          <Link href="/reportes">
            <button
              className={`flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 transition-all ${
                location === "/reportes" ? "bg-violet-50 text-violet-700 shadow-sm" : "text-violet-600 hover:bg-violet-50/70"
              }`}
            >
              <FileText className="h-[18px] w-[18px]" />
              <span className="truncate text-[10px] font-medium leading-tight">Reportes</span>
            </button>
          </Link>
          <Link href="/muestreos">
            <button
              className={`flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 transition-all ${
                location === "/muestreos" ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-emerald-600 hover:bg-emerald-50/70"
              }`}
            >
              <FileUp className="h-[18px] w-[18px]" />
              <span className="truncate text-[10px] font-medium leading-tight">Muestreos</span>
            </button>
          </Link>
          <button
            onClick={() => {
              const page = location === "/muestreos" ? "muestreos" : location === "/reportes" ? "reportes" : "home";
              startTour(page);
            }}
            className="relative flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-slate-500 transition-all hover:bg-slate-100"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
            <span className="truncate text-[10px] font-medium leading-tight">Ayuda</span>
            <span className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-slate-500 transition-all hover:bg-slate-100"
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
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