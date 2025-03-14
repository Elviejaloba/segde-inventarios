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
  value: Branch | null;
  onChange: (branch: Branch) => void;
}

export function BranchSelector({ value, onChange }: BranchSelectorProps) {
  const handleChange = useCallback((newValue: string) => {
    onChange(newValue as Branch);
  }, [onChange]);

  return (
    <Select value={value || undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
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