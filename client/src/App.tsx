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
import { doc, onSnapshot } from "firebase/firestore";
import { Role } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500; // Start with a shorter delay

function Router() {
  const [user, authLoading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<Role>();
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout;
    let mounted = true;

    const setupUserRoleListener = () => {
      if (!user || !mounted) {
        setLoading(false);
        return;
      }

      console.log("Loading user role for:", user.uid);

      try {
        // Cleanup previous listener if exists
        if (unsubscribe) {
          unsubscribe();
        }

        unsubscribe = onSnapshot(
          doc(db, "users", user.uid),
          {
            next: (snapshot) => {
              if (!mounted) return;

              if (snapshot.exists()) {
                const role = snapshot.data().role as Role;
                setUserRole(role);
                setRetryCount(0);
                setLoading(false);
              } else {
                console.warn("User document not found:", user.uid);
                setLoading(false);
                toast({
                  title: "Error de acceso",
                  description: "No se encontró tu información de usuario",
                  variant: "destructive",
                });
              }
            },
            error: (error) => {
              console.error("Error in user role listener:", error);

              if (retryCount < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
                setRetryCount(prev => prev + 1);
                retryTimeout = setTimeout(setupUserRoleListener, delay);
              } else {
                if (mounted) {
                  setLoading(false);
                  toast({
                    title: "Error de conexión",
                    description: "No se pudo cargar tu información. Por favor, verifica tu conexión.",
                    variant: "destructive",
                  });
                }
              }
            }
          }
        );
      } catch (error) {
        console.error("Error setting up listener:", error);
        if (mounted) {
          setLoading(false);
          toast({
            title: "Error de conexión",
            description: "Hubo un problema al cargar tu información.",
            variant: "destructive",
          });
        }
      }
    };

    if (user) {
      setupUserRoleListener();
    } else if (!authLoading) {
      setLoading(false);
    }

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user, authLoading, toast]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">
            {loading ? `Cargando información...` : "Verificando autenticación..."}
          </p>
          {loading && retryCount > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Reintentando... ({retryCount}/{MAX_RETRIES})
            </p>
          )}
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