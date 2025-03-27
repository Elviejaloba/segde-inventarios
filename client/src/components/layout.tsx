import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportExcel } from "@/components/import-excel";

interface LayoutProps {
  children: React.ReactNode;
  hideImport?: boolean;
}

export function Layout({ children, hideImport = false }: LayoutProps) {
  const { theme, setTheme } = useTheme();

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
              Seguimiento de muestreo de invierno
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <TooltipProvider>
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
      {!hideImport && <ImportExcel />}
    </div>
  );
}