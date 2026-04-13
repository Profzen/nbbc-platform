"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function NativeAppMode() {
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    document.body.classList.toggle("native-app", isNative);
    document.body.classList.toggle("native-web", !isNative);
  }, []);

  return null;
}
