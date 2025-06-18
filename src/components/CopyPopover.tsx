import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Button } from "./ui/button";
import { Copy } from "lucide-react";

export function CopyPopover({ value }: { value: string | number }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(String(value))}
        >
          <Copy />
        </Button>
      </PopoverTrigger>
      <PopoverContent>Copiato!</PopoverContent>
    </Popover>
  );
}
