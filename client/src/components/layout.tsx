import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { SettingsDialog } from "@/components/settings-dialog";
import { initializeAudio } from "@/lib/sound-effects";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Initialize audio system when component mounts
    initializeAudio();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b fixed top-0 left-0 right-0 bg-background z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img 
              src="/assets/GRUPO CRISA.jpeg" 
              alt="GRUPO CRISA" 
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold">
              Seguimiento de muestreo de invierno
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <SettingsDialog />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8 mt-16">{children}</main>
    </div>
  );
}