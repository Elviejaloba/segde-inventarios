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

function Router() {
  const [user, authLoading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<Role>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role as Role);
        }
        setLoading(false);
      }
    };

    if (user) {
      loadUserRole();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <HandleAuth />;
  }

  if (!user) {
    return <Auth />;
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