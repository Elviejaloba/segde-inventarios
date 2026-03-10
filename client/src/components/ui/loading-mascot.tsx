import { Loader2 } from "lucide-react";

interface LoadingMascotProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingMascot({ message = "Cargando...", size = "md" }: LoadingMascotProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <Loader2 className={`${iconSizes[size]} text-primary animate-spin`} />
      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
    </div>
  );
}
