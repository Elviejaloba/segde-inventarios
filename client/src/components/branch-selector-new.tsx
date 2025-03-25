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

interface BranchSelectorNewProps {
  value: string;
  onChange: (value: string) => void;
}

// Lista actualizada de sucursales basada en el Excel
const SUCURSALES = [
  'Todas las Sucursales',
  'T.Mendoza',
  'T.SJuan',
  'T.SLuis',
  'Crisa2',
  'T.SMartin',
  'T.Tunuyan',
  'T.Lujan',
  'T.Maipu',
  'T.SRafael'
];

export function BranchSelectorNew({ value, onChange }: BranchSelectorNewProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] bg-white">
        <SelectValue placeholder="Seleccionar Sucursal" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {SUCURSALES.map((sucursal) => (
            <SelectItem key={sucursal} value={sucursal}>
              {sucursal}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}