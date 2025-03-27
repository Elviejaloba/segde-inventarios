import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Temporada } from "@/hooks/use-ajustes-data";

interface SeasonSelectorProps {
  value: Temporada;
  onChange: (value: Temporada) => void;
}

export function SeasonSelector({ value, onChange }: SeasonSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger className="w-[200px] bg-background border-border/50">
        <SelectValue placeholder="Seleccionar Temporada" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Temporada</SelectLabel>
          <SelectItem value="todas">Todas las Temporadas</SelectItem>
          <SelectItem value="invierno">Temporada Invierno (1/3 - 31/8)</SelectItem>
          <SelectItem value="verano">Temporada Verano (1/9 - 28/2)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}