'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';

// Required in production: without this, PDF.js cannot start its worker and fails to render.
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  onPageVisible?: (pageNumber: number) => void;
}

export default function PdfViewer({ url, onPageVisible }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [visiblePageNumber, setVisiblePageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
        setNumPages(totalPages);

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

  // Set up intersection observer to track visible page
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '1', 10);
            setVisiblePageNumber(pageNum);
            if (onPageVisible) {
              onPageVisible(pageNum);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const pageElements = containerRef.current.querySelectorAll('[data-page-num]');
    pageElements.forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pages, onPageVisible]);

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
          className="relative bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden"
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
