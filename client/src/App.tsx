import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import { Auth } from "@/components/auth";
import { HandleAuth } from "@/components/handle-auth";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Role } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

function Router() {
  const [user, authLoading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<Role>();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const loadUserRole = async () => {
      if (!user || !mounted) {
        setLoading(false);
        return;
      }

      try {
        console.log("Loading user role for:", user.uid);
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!mounted) return;

        if (userDoc.exists()) {
          const role = userDoc.data().role as Role;
          setUserRole(role);
        } else {
          console.warn("User document not found:", user.uid);
          toast({
            title: "Error de acceso",
            description: "No se encontró tu información de usuario",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading user role:", error);
        if (mounted) {
          toast({
            title: "Error de conexión",
            description: "No se pudo cargar tu información. Por favor, verifica tu conexión.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadUserRole();
    } else if (!authLoading) {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user, authLoading, toast]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">
            {loading ? "Cargando información..." : "Verificando autenticación..."}
          </p>
        </div>
      </div>
    );
  }

  if (window.location.href.includes("apiKey=") || window.location.href.includes("oobCode=")) {
    return <HandleAuth />;
  }

  if (!user) {
    return <Auth />;
  }

  if (!userRole && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error de conexión</h2>
          <p className="text-muted-foreground">
            No se pudo cargar tu información. Por favor, verifica tu conexión e intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <Home userRole={userRole} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
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