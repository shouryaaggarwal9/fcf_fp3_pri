import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Store Label Printer",
  description: "WebUSB thermal label printer for Madhav Departmental Store",
  themeColor: "#0f172a", // Dark slate status bar color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
      
        {/* Constrain width to look good on desktop but act like mobile */}
        
          
          {/* App Header */}
          
            Madhav Labels
            Retsol R220 Printer
          

          {/* Main Content Area */}
          
            {children}
          

        
      
    
  );
}