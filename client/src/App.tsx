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

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

function Router() {
  const [user, authLoading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<Role>();
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;

    const loadUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log("Loading user role for:", user.uid);
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const role = userDoc.data().role as Role;
          console.log("User role loaded:", role);
          setUserRole(role);
          setRetryCount(0); // Reset retry count on success
        } else {
          console.warn("User document not found:", user.uid);
          throw new Error("No se encontró tu información de usuario");
        }
      } catch (error) {
        console.error("Error loading user role:", error);

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying role load... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          retryTimeout = setTimeout(loadUserRole, RETRY_DELAY);
        } else {
          toast({
            title: "Error de acceso",
            description: "No se pudo cargar tu información después de varios intentos. Por favor, cierra sesión y vuelve a intentarlo.",
            variant: "destructive",
          });
        }
      } finally {
        if (retryCount >= MAX_RETRIES) {
          setLoading(false);
        }
      }
    };

    if (user && !userRole) {
      loadUserRole();
    } else if (!user && !authLoading) {
      setLoading(false);
    }

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user, authLoading, userRole, retryCount, toast]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">
            {loading ? "Cargando información de usuario..." : "Verificando autenticación..."}
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
          <h2 className="text-xl font-bold mb-2">Error de acceso</h2>
          <p className="text-muted-foreground">
            No se pudo cargar tu rol de usuario. Por favor, cierra sesión y vuelve a intentarlo.
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