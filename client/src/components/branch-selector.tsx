import { useCallback, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Branch, AVAILABLE_BRANCHES } from "@/lib/store";
import { MapPin, ChevronRight, X } from "lucide-react";

interface BranchSelectorProps {
  value: Branch | undefined;
  onChange: (branch: Branch) => void;
  hidden?: boolean;
}

export function BranchSelector({ value, onChange, hidden = false }: BranchSelectorProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue as Branch);
  }, [onChange]);

  const handleMobileSelect = useCallback((branch: Branch) => {
    setMobileOpen(false);
    onChange(branch);
  }, [onChange]);

  if (hidden) return null;

  return (
    <>
      {/* Desktop: Select normal */}
      <div className="hidden sm:block">
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger className="h-12 w-[280px] min-w-[280px] rounded-xl border-2 border-primary/25 bg-white px-4 text-[15px] font-medium shadow-sm transition-colors hover:border-primary/40 focus:ring-2 focus:ring-primary/20" data-testid="select-branch">
            <SelectValue placeholder="Selecciona Sucursal" />
          </SelectTrigger>
          <SelectContent className="min-w-[320px] rounded-xl border border-primary/15 shadow-lg">
            {AVAILABLE_BRANCHES.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: BotÃ³n que abre panel fullscreen */}
      <div className="sm:hidden w-full">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-full rounded-xl border-2 border-primary/20 bg-card px-4 py-3 text-left shadow-sm transition-transform active:scale-[0.98]"
          data-testid="select-branch-mobile"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="min-w-0 truncate text-base font-medium">
              {value || "Selecciona Sucursal"}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Mobile: Panel fullscreen de selecciÃ³n */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-[100] flex flex-col bg-background animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-lg font-bold">Seleccionar Sucursal</h2>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-full hover:bg-muted active:bg-muted/80"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 pb-24">
            {AVAILABLE_BRANCHES.map((branch) => (
              <button
                key={branch}
                onClick={() => handleMobileSelect(branch)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl mb-1.5 text-left transition-colors active:scale-[0.98] ${
                  value === branch
                    ? "bg-primary/10 border-2 border-primary text-primary font-semibold"
                    : "bg-card border border-border hover:bg-muted"
                }`}
              >
                <MapPin className={`h-5 w-5 shrink-0 ${value === branch ? "text-primary" : "text-muted-foreground"}`} />
                <span className="min-w-0 break-words text-base leading-tight">{branch}</span>
                {value === branch && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Actual</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}