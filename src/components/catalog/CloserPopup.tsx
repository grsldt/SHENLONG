import { useEffect, useState } from "react";
import { X, MessageCircle, Briefcase, Clock, Globe } from "lucide-react";
import { buildWhatsappUrl, SHENLONG_WHATSAPP_DISPLAY } from "@/lib/catalog";
import { useScrollLock } from "@/hooks/useScrollLock";

const SHOW_DELAY = 2500; // first appearance shortly after arrival
const RESHOW_EVERY = 4 * 60 * 1000; // re-appears often while browsing
const SESSION_KEY = "shenlong-closer-applied";

export function CloserPopup() {
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const first = setTimeout(() => setOpen(true), SHOW_DELAY);
    const loop = setInterval(() => setOpen(true), RESHOW_EVERY);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const apply = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    window.open(
      buildWhatsappUrl(
        "Hi! I'm interested in the WhatsApp Closer position at Shenlong Market.",
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="We are recruiting a WhatsApp closer"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* faint seal watermark */}
        <div className="pointer-events-none absolute -right-4 -top-6 select-none font-mono text-[120px] font-bold leading-none text-brand-seal/5">
          神龍
        </div>

        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative border-b border-border bg-surface-muted px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-seal" />
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand-seal">
              Now recruiting
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            WANTED: WhatsApp Closer
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            We're looking for a closer to handle our WhatsApp conversations —
            someone sales-minded, fast to reply, and hungry to turn every chat
            into a closed deal.
          </p>

          <ul className="mt-4 space-y-2">
            <li className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <Globe className="h-3.5 w-3.5 text-brand-blue" />
              100% remote
            </li>
            <li className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-brand-blue" />
              Flexible hours
            </li>
            <li className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 text-brand-blue" />
              Commission per sale
            </li>
          </ul>

          <button
            onClick={apply}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            Apply on WhatsApp
          </button>

          <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
            {SHENLONG_WHATSAPP_DISPLAY}
          </p>
        </div>
      </div>
    </div>
  );
}
