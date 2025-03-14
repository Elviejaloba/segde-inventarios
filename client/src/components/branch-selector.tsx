import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Branch, branchSchema } from "@shared/schema";

interface BranchSelectorProps {
  value: Branch | undefined;
  onChange: (branch: Branch) => void;
}

export function BranchSelector({ value, onChange }: BranchSelectorProps) {
  const handleChange = useCallback((newValue: string) => {
    onChange(branchSchema.parse(newValue));
  }, [onChange]);

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {Object.values(branchSchema.enum).map((branch) => (
          <SelectItem key={branch} value={branch}>
            {branch}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
