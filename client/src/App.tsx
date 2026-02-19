import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/hooks/use-theme";
import { Route, Switch } from "wouter";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("@/pages/home"));
const ImportacionInventario = lazy(() => import("@/pages/importacion-inventario"));
const Consolidado = lazy(() => import("@/pages/consolidado"));
const Muestreos = lazy(() => import("@/pages/muestreos"));
const Reportes = lazy(() => import("@/pages/reportes"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/importacion-inventario" component={ImportacionInventario} />
              <Route path="/consolidado" component={Consolidado} />
              <Route path="/muestreos" component={Muestreos} />
              <Route path="/reportes" component={Reportes} />
              <Route component={Home} />
            </Switch>
          </Suspense>
        </Layout>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}