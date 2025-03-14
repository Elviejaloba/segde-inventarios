import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import { BranchSelector } from "@/components/branch-selector";
import { useBranchStore } from "@/lib/store";
import Home from "@/pages/home";

function Router() {
  const { selectedBranch, setSelectedBranch } = useBranchStore();

  // Redirigir al home si ya hay una sucursal seleccionada
  useEffect(() => {
    if (!selectedBranch) {
      document.title = "Selecciona tu Sucursal";
    }
  }, [selectedBranch]);

  if (!selectedBranch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold mb-4">Bienvenido</h1>
          <p className="text-muted-foreground mb-4">
            Selecciona tu sucursal para continuar
          </p>
          <BranchSelector
            value={selectedBranch}
            onChange={setSelectedBranch}
          />
        </div>
      </div>
    );
  }

  return <Home />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;