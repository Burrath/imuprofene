import type { ReactElement } from "react";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export function Modal({
  content,
  onClose,
}: {
  content?: ReactElement;
  onClose: () => void;
}) {
  if (!content) return <></>;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center h-screen w-screen p-5">
      <div className="bg-white flex w-full">
        <Button
          onClick={() => onClose()}
          className="ml-auto"
          variant={"ghost"}
          size={"lg"}
        >
          <X />
        </Button>
      </div>
      <div className="h-full w-full bg-white overflow-scroll">{content}</div>
    </div>
  );
}
