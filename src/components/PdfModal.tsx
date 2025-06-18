export function PdfModal({ pdf }: { pdf: any }) {
  return (
    <div className="rounded-lg shadow-lg relative flex flex-col h-full w-full">
      <iframe
        src={URL.createObjectURL(pdf)}
        title="Anteprima PDF"
        className="w-full h-full rounded-b-lg"
      />
    </div>
  );
}
