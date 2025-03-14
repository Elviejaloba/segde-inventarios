import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "./ui/loading-spinner";

export function HandleAuth() {
  const { toast } = useToast();

  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("emailForSignIn");
        let branch = window.localStorage.getItem("branchForSignIn");

        try {
          if (!email) {
            email = window.prompt("Por favor ingresa tu email para confirmar");
          }

          // Parse branch from localStorage
          if (branch) {
            branch = JSON.parse(branch);
          }

          const result = await signInWithEmailLink(auth, email || "", window.location.href);

          // Guardar la asociación usuario-sucursal en Firestore
          if (result.user && branch) {
            await setDoc(doc(db, "users", result.user.uid), {
              email: result.user.email,
              branch: branch,
              createdAt: new Date().toISOString()
            });
          }

          // Limpiar localStorage
          window.localStorage.removeItem("emailForSignIn");
          window.localStorage.removeItem("branchForSignIn");

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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}