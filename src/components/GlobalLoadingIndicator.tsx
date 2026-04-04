"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function GlobalLoadingIndicator() {
  const [activeRequests, setActiveRequests] = useState(0);
  const [navLoading, setNavLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      setActiveRequests((prev) => prev + 1);
      try {
        return await originalFetch(...args);
      } finally {
        setActiveRequests((prev) => Math.max(0, prev - 1));
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    setNavLoading(false);
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = null;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const internalLink = target.closest("a[href]") as HTMLAnchorElement | null;
      if (internalLink) {
        const href = internalLink.getAttribute("href") || "";
        const isInternal = href.startsWith("/") && !href.startsWith("//");
        const isHash = href.startsWith("#");
        const isNewTab = internalLink.target === "_blank";

        if (isInternal && !isHash && !isNewTab) {
          setNavLoading(true);
          if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
          navTimeoutRef.current = setTimeout(() => setNavLoading(false), 6000);
        }
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const visible = useMemo(() => activeRequests > 0 || navLoading, [activeRequests, navLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none">
      <div className="flex items-center gap-2 rounded-full bg-slate-900/90 text-white px-3 py-2 shadow-xl backdrop-blur-sm">
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wide">Chargement...</span>
      </div>
    </div>
  );
}
