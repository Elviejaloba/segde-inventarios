import { useState } from "react";
import { auth } from "@/lib/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BranchSelector } from "@/components/branch-selector";
import { Branch, Role, roleSchema } from "@shared/schema";
import { LoadingSpinner } from "./ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Auth() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("branch");
  const [branch, setBranch] = useState<Branch>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === "branch" && !branch) {
      toast({
        title: "Selecciona una sucursal",
        description: "Por favor selecciona tu sucursal antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };

      // Guardar el email, rol y sucursal en localStorage
      window.localStorage.setItem("emailForSignIn", email);
      window.localStorage.setItem("roleForSignIn", role);
      if (branch) {
        window.localStorage.setItem("branchForSignIn", JSON.stringify(branch));
      }

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      toast({
        title: "¡Link enviado! 📧",
        description: "Revisa tu correo para acceder al sistema. Si no lo encuentras, revisa tu carpeta de spam.",
      });
    } catch (error: any) {
      console.error('Error detallado:', {
        code: error?.code,
        message: error?.message,
        email,
        role,
        branch,
        url: window.location.origin,
        actionCodeSettings: {
          url: window.location.origin,
          handleCodeInApp: true,
          dynamicLinkDomain: window.location.hostname
        }
      });

      let errorMessage = "Por favor intenta nuevamente";
      if (error?.code === 'auth/invalid-email') {
        errorMessage = "El correo electrónico no es válido";
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = "Error de conexión. Verifica tu internet";
      } else if (error?.code === 'auth/configuration-not-found') {
        errorMessage = "Error de configuración. Por favor contacta al administrador. Es necesario habilitar la autenticación por email sin contraseña (Email link sign-in) en Firebase.";
      }

      toast({
        title: "Error al enviar el link",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-6">
            <img 
              src="/assets/GRUPO CRISA.webp" 
              alt="GRUPO CRISA" 
              className="h-16 w-auto"
              width="145"
              height="64"
              loading="lazy"
            />
          </div>
          <CardTitle className="text-2xl text-center">Acceder al Sistema</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu correo y selecciona tu rol para recibir un link de acceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Supervisor (Solo visualización)</SelectItem>
                  <SelectItem value="branch">Sucursal (Edición)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "branch" && (
              <div className="space-y-2">
                <BranchSelector value={branch} onChange={setBranch} />
              </div>
            )}

            <div className="space-y-2">
              <Input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner />
                  <span>Enviando enlace...</span>
                </div>
              ) : (
                "Enviar Link de Acceso"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}