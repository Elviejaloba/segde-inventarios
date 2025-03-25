import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface BranchSelectorNewProps {
  value: string;
  onChange: (value: string) => void;
}

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
    <Card className="bg-card p-4">
      <div className="flex items-center gap-4">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Seleccionar Sucursal" />
          </SelectTrigger>
          <SelectContent>
            {SUCURSALES.map((sucursal) => (
              <SelectItem key={sucursal} value={sucursal}>
                {sucursal}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {value === 'Todas las Sucursales' 
            ? "Mostrando datos consolidados de todas las sucursales"
            : `Mostrando datos de ${value}`}
        </div>
      </div>
    </Card>
  );
}
