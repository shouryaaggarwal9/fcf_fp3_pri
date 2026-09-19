import type { Metadata, Viewport } from "next";
import InstallButton from "./install-button";
import RegisterSW from "./register-sw";
import "./globals.css";

// Next.js 14+ requires metadata and viewport to be exported separately
export const metadata: Metadata = {
  title: "Store Label Printer",
  description: "WebUSB thermal label printer for Madhav Departmental Store",
  applicationName: "Madhav Labels",
  appleWebApp: {
    capable: true,
    title: "Madhav Labels",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Outer body spans the whole screen, centers the app container */}
      <body className="bg-slate-200 text-slate-900 antialiased h-dvh w-screen overflow-hidden flex justify-center">
        <RegisterSW />
        {/* Mobile App Container: Strictly limits width and height */}
        <div className="flex flex-col w-full max-w-md h-full bg-white shadow-2xl relative overflow-hidden">
          {/* App Header */}
          <header className="shrink-0 bg-slate-900 px-4 py-4 text-white shadow-md z-20 relative flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Madhav Labels</h1>
              <p className="text-xs text-slate-400">Retsol R220 Printer</p>
            </div>
            <InstallButton />
          </header>

          {/* Main Content Area: Fills remaining space and scrolls internally */}
          <main className="flex-1 overflow-y-auto relative bg-white">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
