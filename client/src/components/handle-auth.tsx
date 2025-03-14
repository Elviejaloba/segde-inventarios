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
      // Solo proceder si estamos en una URL de autenticación
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("emailForSignIn");
        let role = window.localStorage.getItem("roleForSignIn");
        let branch = window.localStorage.getItem("branchForSignIn");

        try {
          // Solicitar email si no está en localStorage
          if (!email) {
            email = window.prompt("Por favor ingresa tu email para confirmar");
            if (!email) {
              throw new Error("Se requiere el email para continuar");
            }
          }

          // Validar rol
          if (!role) {
            role = "branch"; // Rol por defecto
          }

          // Parse branch from localStorage if exists
          let parsedBranch = undefined;
          if (branch) {
            try {
              parsedBranch = JSON.parse(branch);
            } catch (e) {
              console.error("Error parsing branch:", e);
            }
          }

          // Completar el proceso de autenticación
          const result = await signInWithEmailLink(auth, email, window.location.href);

          if (!result.user) {
            throw new Error("No se pudo completar la autenticación");
          }

          // Guardar la información del usuario en Firestore
          await setDoc(doc(db, "users", result.user.uid), {
            email: result.user.email,
            role: roleSchema.parse(role),
            ...(parsedBranch ? { branch: parsedBranch } : {}),
            createdAt: new Date().toISOString()
          });

          // Limpiar localStorage
          window.localStorage.removeItem("emailForSignIn");
          window.localStorage.removeItem("roleForSignIn");
          window.localStorage.removeItem("branchForSignIn");

          // Notificar éxito
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
            description: error instanceof Error ? error.message : "Por favor intenta nuevamente",
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