"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("ServiceWorker registration successful with scope: ", registration.scope);
        })
        .catch((err) => {
          console.log("ServiceWorker registration failed: ", err);
        });
    }
  }, []);

  return null;
}