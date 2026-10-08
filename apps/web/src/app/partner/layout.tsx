import { InternalWorkspaceGate } from "@/components/auth/InternalWorkspaceGate";
export default function Layout({ children }: { children: React.ReactNode }) { return <InternalWorkspaceGate>{children}</InternalWorkspaceGate>; }
