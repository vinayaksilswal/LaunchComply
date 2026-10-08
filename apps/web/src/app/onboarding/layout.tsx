"use client";
import { useAccount } from "@/components/auth/AccountProvider";
import Link from "next/link";
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, error, user } = useAccount();
  if (loading)
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center p-8 text-sm text-slate-500"
      >
        Loading your business account…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="mx-auto my-16 max-w-lg space-y-4 rounded-xl border border-rose-200 p-6 text-sm text-rose-800"
      >
        <p>{error}</p>
        <Link
          href="/login?next=%2Fonboarding"
          className="font-semibold underline"
        >
          Return to sign-in
        </Link>
      </div>
    );
  if (!user) return null;
  return children;
}
