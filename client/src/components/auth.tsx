import { useState } from "react";
import { auth } from "@/lib/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BranchSelector } from "@/components/branch-selector";
import { Branch } from "@shared/schema";

export function Auth() {
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState<Branch>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!branch) {
      toast({
        title: "Selecciona una sucursal",
        description: "Por favor selecciona tu sucursal antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Configuración para el link de autenticación
      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
      };

      // Guardar el email y la sucursal en localStorage para completar el proceso
      window.localStorage.setItem("emailForSignIn", email);
      window.localStorage.setItem("branchForSignIn", branch);

      // Enviar el link mágico
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      toast({
        title: "¡Link enviado! 📧",
        description: "Revisa tu correo para acceder al sistema",
      });
    } catch (error) {
      toast({
        title: "Error al enviar el link",
        description: "Por favor intenta nuevamente",
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
              src="/assets/GRUPO CRISA.jpeg" 
              alt="GRUPO CRISA" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-center">Acceder al Sistema</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu correo y selecciona tu sucursal para recibir un link de acceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <BranchSelector value={branch} onChange={setBranch} />
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Link de Acceso"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}