import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JETVORYX | Private Aviation, Elevated",
  description: "Experience luxury private jet charter with JETVORYX. Search, compare, and book private flights worldwide.",
  keywords: "private jet, charter, luxury aviation, private flights, jet rental",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-jet-black text-white">
        {children}
      </body>
    </html>
  );
}
