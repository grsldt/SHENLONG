import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast, Toaster } from "sonner";
import { ArrowLeft, Lock, MessageCircle, Send } from "lucide-react";
import { buildWhatsappUrl, SHENLONG_WHATSAPP_DISPLAY } from "@/lib/catalog";

type Mode = "contact" | "signin" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ admin: s.admin ? "1" : undefined }),
  component: AuthPage,
  head: () => ({ meta: [{ title: "Contact & Admin · Shenlong Market" }] }),
});

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-foreground text-background px-2 py-1 rounded text-base font-extrabold">神龙</span>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-lg">SHENLONG</div>
        <div className="text-[10px] font-mono text-muted-foreground tracking-widest">PRECISION WHOLESALE</div>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.admin ? "signin" : "contact");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [c, setC] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && mode !== "contact") navigate({ to: "/admin" });
    });
  }, [mode, navigate]);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        toast.success("Welcome back 欢迎");
        navigate({ to: "/admin" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!c.name.trim() || !c.email.trim() || !c.message.trim()) {
      toast.error("Name, email and message are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: c.name.trim(),
      email: c.email.trim(),
      phone: c.phone.trim() || null,
      subject: c.subject.trim() || null,
      message: c.message.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Message sent — we'll reply within 24h 谢谢");
    setC({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster richColors position="top-center" />
      <span className="absolute font-extrabold text-foreground/[0.04] text-[clamp(280px,55vw,640px)] leading-none select-none pointer-events-none">神龙</span>

      <div className="relative w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-accent mb-3">
          <ArrowLeft size={12} /> Back to catalog
        </Link>

        <div className="bg-background border border-border rounded-xl p-6 md:p-8">
          <div className="mb-5"><Brand /></div>

          {mode === "contact" ? (
            <>
              <h1 className="text-2xl font-extrabold mb-1">Contact us 联系我们</h1>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-5">
                Wholesale enquiries · partnerships · custom orders
              </p>
              <form onSubmit={submitContact} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Your name *" className="bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent text-sm" />
                  <input required type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} placeholder="Email *" className="bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="Phone (optional)" className="bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent text-sm" />
                  <input value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} placeholder="Subject" className="bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent text-sm" />
                </div>
                <textarea required rows={5} value={c.message} onChange={(e) => setC({ ...c, message: e.target.value })} placeholder="Your message *" className="w-full bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent text-sm resize-y" />
                <button type="submit" disabled={busy} className="w-full bg-foreground text-background font-bold uppercase tracking-widest py-3 rounded-md hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send size={16} /> {busy ? "Sending..." : "Send message"}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
                <a href={buildWhatsappUrl()} target="_blank" rel="noopener" className="text-accent font-bold uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80">
                  <MessageCircle size={14} /> Or chat on WhatsApp
                </a>
                <button onClick={() => setMode("signin")} className="text-muted-foreground hover:text-accent uppercase tracking-widest flex items-center gap-1">
                  <Lock size={11} /> Admin
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-1">{mode === "signin" ? "Admin Sign In" : "Reset Password"}</h1>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-5">管理员入口 · Admin only</p>

              <form onSubmit={submitAuth} className="space-y-3">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent" />
                {mode !== "forgot" && (
                  <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password (min 6)" minLength={6} className="w-full bg-surface-muted px-3 py-2.5 border border-border rounded-md focus:outline-none focus:border-accent" />
                )}
                <button type="submit" disabled={busy} className="w-full bg-foreground text-background font-bold uppercase tracking-widest py-3 rounded-md hover:bg-accent disabled:opacity-50">
                  {busy ? "..." : (mode === "signin" ? "Sign In" : "Send Reset Link")}
                </button>
              </form>

              <div className="mt-4 flex flex-col gap-2 text-xs text-center uppercase tracking-widest">
                {mode === "signin" && (
                  <button onClick={() => setMode("forgot")} className="text-muted-foreground hover:text-accent">Forgot password?</button>
                )}
                {mode === "forgot" && (
                  <button onClick={() => setMode("signin")} className="text-muted-foreground hover:text-accent">Back to sign in</button>
                )}
                <button onClick={() => setMode("contact")} className="text-muted-foreground hover:text-accent mt-2">← Back to contact form</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
