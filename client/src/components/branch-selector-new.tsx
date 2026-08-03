import { useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_BRANCHES } from "@/lib/store";

interface BranchSelectorNewProps {
  value: string;
  onChange: (value: string) => void;
  showPlaceholder?: boolean;
}

export function BranchSelectorNew({ value, onChange, showPlaceholder = true }: BranchSelectorNewProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 w-full min-w-[280px] sm:w-[320px] rounded-xl border-2 border-primary/20 bg-background px-4 text-[15px] font-medium shadow-sm transition-colors hover:border-primary/35 focus:ring-2 focus:ring-primary/20">
        {showPlaceholder ? (
          <SelectValue placeholder="Seleccionar Sucursal" />
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className="min-w-[320px] rounded-xl border border-primary/15 shadow-lg">
        <SelectGroup>
          <SelectItem value="Todas las Sucursales">Todas las Sucursales</SelectItem>
          {AVAILABLE_BRANCHES.map((sucursal) => (
            <SelectItem key={sucursal} value={sucursal}>
              {sucursal}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}