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
import { useEffect, useState } from "react";
import { Role } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

function Router() {
  const [user, authLoading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<Role>();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
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
        } else {
          console.warn("User document not found:", user.uid);
          toast({
            title: "Error de acceso",
            description: "No se encontró tu información de usuario. Por favor, cierra sesión y vuelve a intentarlo.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading user role:", error);
        toast({
          title: "Error de acceso",
          description: "Hubo un problema al cargar tu información. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && !userRole) {
      loadUserRole();
    } else if (!user && !authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, userRole, toast]);

  // Mostrar loading spinner mientras se carga la autenticación
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Si hay un link de autenticación en la URL, mostrar el componente HandleAuth
  if (window.location.href.includes("apiKey=") || window.location.href.includes("oobCode=")) {
    return <HandleAuth />;
  }

  // Si no hay usuario, mostrar la página de autenticación
  if (!user) {
    return <Auth />;
  }

  // Si hay usuario pero no tiene rol, mostrar mensaje de error
  if (!userRole) {
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