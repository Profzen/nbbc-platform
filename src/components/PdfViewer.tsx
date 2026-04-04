'use client';

import { useState, useEffect, useRef } from 'react';
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';

// Required in production: without this, PDF.js cannot start its worker and fails to render.
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  signingMode?: boolean;
  onPageClick?: (payload: { pageNumber: number; xRatio: number; yRatio: number }) => void;
}

export default function PdfViewer({ url, signingMode = false, onPageClick }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF and render all pages
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const pdf = await getDocument(url).promise;
        if (cancelled) return;
        const totalPages = pdf.numPages;

        const pageImages: string[] = [];
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            canvas,
            viewport,
          }).promise;

          pageImages.push(canvas.toDataURL('image/png'));
        }

        if (cancelled) return;
        setPages(pageImages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading PDF:', err);
        setError('Erreur de chargement du PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const onPageContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!signingMode || !onPageClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width));
    const yRatio = Math.min(0.95, Math.max(0.05, (event.clientY - rect.top) / rect.height));
    const pageNumber = Number(event.currentTarget.dataset.pageNum || 1);

    onPageClick({ pageNumber, xRatio, yRatio });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p className="text-sm text-slate-600">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="text-center text-rose-600">
          <p className="font-semibold">Impossible d'afficher le document</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-y-auto bg-slate-100 flex flex-col items-center gap-4 p-4">
      {pages.map((pageImage, index) => (
        <div
          key={index}
          data-page-num={index + 1}
          onClick={onPageContainerClick}
          className={`relative bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden ${signingMode ? 'cursor-crosshair ring-2 ring-indigo-300/70' : ''}`}
        >
          <img
            src={pageImage}
            alt={`Page ${index + 1}`}
            className="w-full h-auto max-w-2xl"
          />
          <div className="absolute bottom-2 right-2 text-xs bg-slate-900/70 text-white px-2 py-1 rounded">
            Page {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
