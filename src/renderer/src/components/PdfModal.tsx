import { useEffect, useState } from 'react'

export function PdfModal({ pdf }: { pdf: File }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const arrayBuffer = await pdf.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)

      return () => {
        URL.revokeObjectURL(url) // pulizia
      }
    })()
  }, [pdf])

  return (
    <div className="rounded-lg shadow-lg relative flex flex-col h-full w-full">
      {pdfUrl && <iframe src={pdfUrl} className="w-full h-full rounded-b-lg" title="PDF Viewer" />}
    </div>
  )
}
