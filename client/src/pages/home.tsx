import { useState, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { Branch } from "@shared/schema";
import { BranchSelector } from "@/components/branch-selector";
import { Checklist } from "@/components/checklist";
import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { Share } from "lucide-react";

export default function Home() {
  const [user] = useAuthState(auth);
  const [selectedBranch, setSelectedBranch] = useState<Branch>();

  const handleShare = useCallback(() => {
    if (!selectedBranch) return;

    const message = encodeURIComponent(
      `Seguimiento de pedido para sucursal ${selectedBranch}\n\n` +
      "Esta es una herramienta de seguimiento. La comunicación debe realizarse " +
      "vía mail adjuntando el comprobante de toma de inventario del artículo solicitado."
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  }, [selectedBranch]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Welcome to Winter Sampling Tracker</h2>
        <p className="text-muted-foreground">Please sign in to continue</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
        {selectedBranch && (
          <Button onClick={handleShare}>
            <Share className="mr-2 h-4 w-4" />
            Share on WhatsApp
          </Button>
        )}
      </div>

      {selectedBranch ? (
        <Checklist branch={selectedBranch} />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
