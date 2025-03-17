import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import { ThemeProvider } from "@/hooks/use-theme";

export default function App() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      ThemeProvider,
      { defaultTheme: "light", storageKey: "vite-ui-theme" },
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Layout, null, React.createElement(Home)),
          React.createElement(Toaster)
        )
      )
    )
  );
}