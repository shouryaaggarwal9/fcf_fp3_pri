"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  // Start hidden so server render (and the flash before hydration) shows nothing;
  // it only appears once we know the app is not already installed.
  const [installed, setInstalled] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    setInstalled(standalone);
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );

    const onPrompt = (e: Event) => {
      // Prevent the browser's mini-infobar so our in-app button controls install.
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    setShowIOSHelp((v) => !v);
  };

  // No install prompt available and not iOS (e.g. desktop Firefox) — the
  // browser's own install UI is the only path, so show nothing here.
  if (!installEvent && !isIOS) return null;

  return (
    <div className="relative shrink-0">
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Install
      </button>

      {showIOSHelp && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-slate-800 text-slate-100 text-xs leading-relaxed rounded-xl p-3 shadow-xl border border-white/10 z-50">
          In Safari, tap the <span className="font-bold">Share</span> button, then{" "}
          <span className="font-bold">Add to Home Screen</span> to install the app.
        </div>
      )}
    </div>
  );
}
