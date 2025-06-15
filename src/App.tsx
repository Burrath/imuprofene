import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";

import { Check, ChevronRight, Loader, Plus, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { pdfToRawTextData, type pdfToRawTextDataRes } from "./lib/pdf";

type DroppedFile = {
  _id: string;
  file: File;
  rawData: pdfToRawTextDataRes[] | null;
  isLoading: boolean;
};

export default function App() {
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles: DroppedFile[] = Array.from(e.dataTransfer.files).map(
        (file) => ({
          _id: generateId(),
          file,
          rawData: null,
          isLoading: false,
        })
      );
      setDroppedFiles((prev) => [...prev, ...newFiles]);
      e.dataTransfer.clearData();
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: DroppedFile[] = Array.from(e.target.files).map(
        (file) => ({
          _id: generateId(),
          file,
          rawData: null,
          isLoading: false,
        })
      );
      setDroppedFiles((prev) => [...prev, ...newFiles]);
    }
  }

  function openFileSelector() {
    fileInputRef.current?.click();
  }

  const run = async () => {
    // Step 1: set all files to loading
    setDroppedFiles((prev) =>
      prev.map((file) => ({
        ...file,
        isLoading: true,
      }))
    );

    // Step 2: process files one by one
    for (const file of droppedFiles) {
      const rawData = await pdfToRawTextData(file.file);

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) =>
          f._id === file._id ? { ...f, rawData, isLoading: false } : f
        )
      );
    }
  };

  const removeFile = (id: string) => {
    setDroppedFiles((prev) => prev.filter((file) => file._id !== id));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen relative space-y-4 flex flex-col"
    >
      {isDragging && (
        <div className="absolute rounded inset-0 flex items-center justify-center border-blue-500 bg-blue-100 border-5 pointer-events-none">
          <div className="flex items-center justify-center">
            <p>Drop like it's hot 🔥</p>
          </div>
        </div>
      )}

      <div>
        <Button
          size={"lg"}
          variant={"outline"}
          className="rounded-full m-5"
          onClick={openFileSelector}
        >
          <Plus />
        </Button>

        <Button onClick={run} size={"lg"}>
          <ChevronRight />
          <ChevronRight />
        </Button>
      </div>

      {droppedFiles.filter((e) => e.isLoading).length > 0 && (
        <div className="h-3 bg-gray-200 mx-3 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000"
            style={{
              width: `${
                (1 -
                  droppedFiles.filter((e) => e.isLoading).length /
                    droppedFiles.length) *
                100
              }%`,
            }}
          />
        </div>
      )}

      {droppedFiles.length > 0 && (
        <div className="flex flex-col gap-3 px-3">
          {droppedFiles.map((fileObj) => (
            <div
              className="border rounded p-3 bg-gray-50 flex items-center gap-3"
              key={fileObj._id}
            >
              <Button
                onClick={() => removeFile(fileObj._id)}
                variant={"ghost"}
                className="text-red-600"
              >
                <X />
              </Button>
              <span>{fileObj.file.name}</span>
              <div className="ml-auto">
                {fileObj.isLoading && <Loader className="animate-spin" />}

                {!fileObj.isLoading && fileObj.rawData && (
                  <>
                    {!!fileObj.rawData.length && <Check />}{" "}
                    {!fileObj.rawData.length && <X />}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
