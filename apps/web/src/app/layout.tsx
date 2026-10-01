import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchComply — From Localhost to Real Business",
  description: "Deploy, secure, audit and prepare your application for enterprise customers — from one unified platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
