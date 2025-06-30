import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "./ui/button";
import { Download } from "lucide-react";

export type ExcelRow = { [key: string]: string | number | boolean | null };

export interface ExcelSheets {
  [sheetName: string]: ExcelRow[];
}

interface MultiSheetExcelButtonProps {
  sheets: ExcelSheets;
  fileName?: string;
}

const ExcelDownloadButton: React.FC<MultiSheetExcelButtonProps> = ({
  sheets,
  fileName = "multi-sheet-export.xlsx",
}) => {
  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();

    Object.entries(sheets).forEach(([sheetName, data]) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, fileName);
  };

  return (
    <Button size={"sm"} variant={"ghost"} onClick={handleDownload}>
      <Download />
    </Button>
  );
};

export default ExcelDownloadButton;
