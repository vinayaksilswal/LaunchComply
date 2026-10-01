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
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
