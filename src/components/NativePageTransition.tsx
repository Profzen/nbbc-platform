"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";

interface NativePageTransitionProps {
  children: React.ReactNode;
}

export default function NativePageTransition({ children }: NativePageTransitionProps) {
  const pathname = usePathname();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return (
    <div key={isNative ? pathname : "web"} className={isNative ? "native-page-transition" : ""}>
      {children}
    </div>
  );
}
