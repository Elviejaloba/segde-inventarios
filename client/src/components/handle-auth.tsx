import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "./ui/loading-spinner";

export function HandleAuth() {
  const { toast } = useToast();

  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("emailForSignIn");
        
        if (!email) {
          email = window.prompt("Por favor ingresa tu email para confirmar");
        }

        try {
          await signInWithEmailLink(auth, email || "", window.location.href);
          window.localStorage.removeItem("emailForSignIn");
          
          toast({
            title: "¡Bienvenido! 👋",
            description: "Has iniciado sesión correctamente",
          });

          // Limpiar la URL
          window.history.replaceState({}, "", window.location.pathname);
        } catch (error) {
          toast({
            title: "Error al iniciar sesión",
            description: "Por favor intenta nuevamente",
            variant: "destructive",
          });
        }
      }
    };

    completeSignIn();
  }, [toast]);

  return <LoadingSpinner />;
}
