import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "./ui/loading-spinner";
import { roleSchema } from "@shared/schema";
import { useLocation } from "wouter";

export function HandleAuth() {
  const { toast } = useToast();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const completeSignIn = async () => {
      // Si no estamos en un link de autenticación, redirigir a home
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setLocation("/");
        return;
      }

      try {
        // Recuperar datos del localStorage
        let email = window.localStorage.getItem("emailForSignIn");
        let role = window.localStorage.getItem("roleForSignIn");
        let branch = window.localStorage.getItem("branchForSignIn");

        // Validar email
        if (!email) {
          email = window.prompt("Por favor ingresa tu email para confirmar");
          if (!email) {
            throw new Error("Se requiere el email para continuar");
          }
        }

        // Validar y parsear rol
        if (!role) {
          role = "branch"; // Rol por defecto
        }

        // Parsear branch si existe
        let parsedBranch = undefined;
        if (branch) {
          try {
            parsedBranch = JSON.parse(branch);
          } catch (e) {
            console.error("Error parsing branch:", e);
          }
        }

        console.log("Iniciando proceso de autenticación:", {
          email,
          role,
          hasBranch: !!parsedBranch
        });

        // Autenticar usuario
        const result = await signInWithEmailLink(auth, email, window.location.href);
        if (!result.user) {
          throw new Error("No se pudo completar la autenticación");
        }

        console.log("Usuario autenticado:", {
          uid: result.user.uid,
          email: result.user.email
        });

        // Preparar datos del usuario
        const userData = {
          email: result.user.email,
          role: roleSchema.parse(role),
          ...(parsedBranch ? { branch: parsedBranch } : {}),
          createdAt: new Date().toISOString()
        };

        // Guardar datos en Firestore
        const userRef = doc(db, "users", result.user.uid);
        await setDoc(userRef, userData);

        // Verificar que los datos se guardaron correctamente
        const verifyDoc = await getDoc(userRef);
        if (!verifyDoc.exists()) {
          throw new Error("Error al guardar la información del usuario");
        }

        console.log("Datos de usuario guardados y verificados:", userData);

        // Limpiar localStorage
        window.localStorage.removeItem("emailForSignIn");
        window.localStorage.removeItem("roleForSignIn");
        window.localStorage.removeItem("branchForSignIn");

        // Notificar éxito
        toast({
          title: "¡Bienvenido! 👋",
          description: `Has iniciado sesión como ${role === "owner" ? "supervisor" : "sucursal"}`,
        });

        // Redirigir y limpiar URL
        window.history.replaceState({}, "", "/");
        setLocation("/");
      } catch (error) {
        console.error("Error detallado de autenticación:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setError(errorMessage);
        toast({
          title: "Error al iniciar sesión",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    completeSignIn();
  }, [toast, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error de autenticación</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">Completando autenticación...</p>
        </div>
      </div>
    );
  }

  return null;
}