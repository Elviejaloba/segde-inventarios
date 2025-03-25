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
}

export function BranchSelectorNew({ value, onChange }: BranchSelectorNewProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] bg-white">
        <SelectValue placeholder="Seleccionar Sucursal" />
      </SelectTrigger>
      <SelectContent>
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