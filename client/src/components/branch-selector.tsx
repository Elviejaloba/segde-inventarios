import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Branch, AVAILABLE_BRANCHES } from "@/lib/store";

interface BranchSelectorProps {
  value: Branch | undefined;
  onChange: (branch: Branch) => void;
  hidden?: boolean;  // Nueva prop para controlar visibilidad
}

export function BranchSelector({ value, onChange, hidden = false }: BranchSelectorProps) {
  const handleChange = useCallback((newValue: string) => {
    onChange(newValue as Branch);
  }, [onChange]);

  if (hidden) return null;  // Si hidden es true, no renderizar nada

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-[180px] md:w-[200px]">
        <SelectValue placeholder="Selecciona Sucursal" />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_BRANCHES.map((branch) => (
          <SelectItem key={branch} value={branch}>
            {branch}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}