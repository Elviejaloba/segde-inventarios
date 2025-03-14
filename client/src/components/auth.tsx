import { useState } from "react";
import { auth } from "@/lib/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function Auth() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Configuración para el link de autenticación
      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
      };

      // Guardar el email en localStorage para completar el proceso
      window.localStorage.setItem("emailForSignIn", email);

      // Enviar el link mágico
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      toast({
        title: "¡Link enviado! 📧",
        description: "Revisa tu correo para continuar con el acceso",
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Acceder al Sistema</CardTitle>
        <CardDescription>
          Ingresa tu correo electrónico para recibir un link de acceso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Link de Acceso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
