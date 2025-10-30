import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import ImportacionInventario from "@/pages/importacion-inventario";
import Consolidado from "@/pages/consolidado";
import { ThemeProvider } from "@/hooks/use-theme";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/importacion-inventario" component={ImportacionInventario} />
            <Route path="/consolidado" component={Consolidado} />
            <Route component={Home} />
          </Switch>
        </Layout>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}