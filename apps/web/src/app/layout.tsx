import type { Metadata } from "next";
import "./globals.css";
import { AccountProvider } from "@/components/auth/AccountProvider";

export const metadata: Metadata = {
  title: "LaunchComply — From Localhost to Real Business",
  description:
    "Understand your app, plan its cloud design, request deployment and assessment help, and track actual delivered reports in your business workspace.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://launch-comply-tau.vercel.app",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased min-h-screen">
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
