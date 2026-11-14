import type { Metadata } from "next";
import "./globals.css";
import { AccountProvider } from "@/components/auth/AccountProvider";
import { Analytics } from "@/components/marketing/Analytics";

export const metadata: Metadata = {
  title: "LaunchComply — From Localhost to Real Business",
  description:
    "Built an app with AI? LaunchComply guides you step by step to put it online on free hosting you own, keeps watch on it, and offers expert help when your business needs it.",
  openGraph: {
    title: "LaunchComply — From Localhost to Real Business",
    description: "Put the app you built with AI online, step by step, in hosting accounts you own.",
    type: "website",
    siteName: "LaunchComply",
  },
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
        <Analytics />
      </body>
    </html>
  );
}
