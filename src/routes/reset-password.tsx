import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset Password · Shenlong Market" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pw !== pw2) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { admin: "1" } });
  };

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster richColors position="top-center" />
      <span className="absolute font-extrabold text-foreground/[0.04] text-[400px] leading-none select-none pointer-events-none">神龙</span>
      <div className="bg-background w-full max-w-md p-8 border border-border rounded-xl relative">
        <div className="flex items-center gap-2 mb-6">
          <span className="bg-foreground text-background px-2 py-1 rounded text-base font-extrabold">神龙</span>
          <div className="font-extrabold tracking-tight">SHENLONG</div>
        </div>
        <h1 className="text-2xl font-extrabold mb-1">Set New Password</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">重置密码</p>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 6)" minLength={6} className="w-full bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent" />
            <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm password" minLength={6} className="w-full bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent" />
            <button type="submit" disabled={busy} className="w-full bg-foreground text-background font-bold uppercase tracking-widest py-3 rounded-md hover:bg-accent disabled:opacity-50">
              {busy ? "..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
