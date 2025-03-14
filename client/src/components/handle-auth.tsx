import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "./ui/loading-spinner";
import { roleSchema } from "@shared/schema";

export function HandleAuth() {
  const { toast } = useToast();

  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("emailForSignIn");
        let role = window.localStorage.getItem("roleForSignIn");
        let branch = window.localStorage.getItem("branchForSignIn");

        try {
          if (!email) {
            email = window.prompt("Por favor ingresa tu email para confirmar");
          }

          if (!role) {
            role = "branch"; // Default role
          }

          // Parse branch from localStorage if exists
          if (branch) {
            branch = JSON.parse(branch);
          }

          const result = await signInWithEmailLink(auth, email || "", window.location.href);

          // Guardar la información del usuario en Firestore
          if (result.user) {
            await setDoc(doc(db, "users", result.user.uid), {
              email: result.user.email,
              role: roleSchema.parse(role),
              ...(branch ? { branch } : {}),
              createdAt: new Date().toISOString()
            });
          }

          // Limpiar localStorage
          window.localStorage.removeItem("emailForSignIn");
          window.localStorage.removeItem("roleForSignIn");
          window.localStorage.removeItem("branchForSignIn");

          toast({
            title: "¡Bienvenido! 👋",
            description: `Has iniciado sesión como ${role === "owner" ? "dueño" : "sucursal"}`,
          });

          // Limpiar la URL
          window.history.replaceState({}, "", window.location.pathname);
        } catch (error) {
          console.error("Error al iniciar sesión:", error);
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