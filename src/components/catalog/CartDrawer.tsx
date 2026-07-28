import { useEffect, useMemo, useState } from "react";
import { Product, SiteSettings, buildWhatsappUrl, formatPrice, resolveImageUrl } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { X, Trash2, MessageCircle, ShoppingBag, Minus, Plus } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useCart } from "@/hooks/useCart";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: SiteSettings;
  brandLookup: Record<string, string>;
}

export const CartDrawer = ({ open, onClose, settings, brandLookup }: Props) => {
  const cart = useCart();
  const [products, setProducts] = useState<Record<string, Product>>({});
  useScrollLock(open);

  const ids = useMemo(() => Array.from(new Set(cart.items.map((i) => i.id))), [cart.items]);

  useEffect(() => {
    if (!open || ids.length === 0) {
      setProducts({});
      return;
    }
    supabase
      .from("products")
      .select("*, images:product_images(id, product_id, url, sort_order)")
      .in("id", ids)
      .then(({ data }) => {
        const map: Record<string, Product> = {};
        ((data as any[]) ?? []).forEach((p) => {
          map[p.id] = p;
        });
        setProducts(map);
      });
  }, [open, ids.join(",")]);

  const total = cart.items.reduce((s, line) => s + ((products[line.id]?.price ?? 0) * line.qty), 0);

  const orderAll = () => {
    if (cart.items.length === 0) return;
    const lines = ["Hi SHENLONG 神龍,", "", `I'd like to order ${cart.totalQty} item(s):`];
    cart.items.forEach((line, i) => {
      const p = products[line.id];
      const brand = p ? brandLookup[p.brand_id] ?? "" : "";
      const title = p?.title ?? line.id;
      const bits: string[] = [];
      if (line.color) bits.push(`Color: ${line.color}`);
      if (line.size) bits.push(`Size: ${line.size}`);
      bits.push(`Qty: ${line.qty}`);
      const priceStr = p?.price ? ` — ${formatPrice(p.price, p.currency)}` : "";
      lines.push(`${i + 1}. ${brand ? brand + " — " : ""}${title}${priceStr}`);
      lines.push(`   ${bits.join(" · ")}`);
    });
    if (total > 0) lines.push("", `Estimated total: ${formatPrice(total, "USD")}`);
    lines.push("", "Thanks!");
    window.open(buildWhatsappUrl(lines.join("\n")), "_blank", "noopener");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <aside className="relative w-full max-w-md bg-card h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-xl flex items-center gap-2 tracking-tight">
              <ShoppingBag size={18} /> Cart
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{cart.totalQty} ITEM(S)</p>
          </div>
          <div className="flex gap-3 items-center">
            {cart.items.length > 0 && (
              <button onClick={cart.clear} className="text-[10px] font-mono uppercase tracking-widest text-destructive hover:underline">
                Clear
              </button>
            )}
            <button onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.items.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
              No items yet.
              <p className="text-xs mt-1">Open a product, pick a size, then add it.</p>
            </div>
          ) : (
            cart.items.map((line, idx) => {
              const p = products[line.id];
              const main = p?.images?.[0];
              return (
                <div key={`${line.id}-${idx}`} className="flex gap-3 border border-border rounded-md bg-background p-2">
                  <div className="w-16 h-16 bg-muted shrink-0 rounded-sm overflow-hidden">
                    {main && <img src={resolveImageUrl(main.url, settings.image_base_url)} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest truncate">{p ? brandLookup[p.brand_id] : ""}</p>
                    <p className="text-sm font-semibold truncate">{p?.title ?? "…"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {line.color && <>Color: <span className="text-foreground font-medium">{line.color}</span> · </>}
                      {line.size && <>Size: <span className="text-foreground font-medium">{line.size}</span></>}
                      {!line.size && !line.color && <span className="italic">No variant</span>}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center border border-border rounded-sm">
                        <button onClick={() => cart.setQty(idx, line.qty - 1)} className="w-7 h-7 grid place-items-center hover:bg-muted" aria-label="Decrease"><Minus size={12} /></button>
                        <span className="w-7 text-center text-xs font-bold">{line.qty}</span>
                        <button onClick={() => cart.setQty(idx, line.qty + 1)} className="w-7 h-7 grid place-items-center hover:bg-muted" aria-label="Increase"><Plus size={12} /></button>
                      </div>
                      {p?.price && <span className="text-sm font-bold">{formatPrice(p.price * line.qty, p.currency)}</span>}
                    </div>
                  </div>
                  <button onClick={() => cart.removeAt(idx)} className="text-destructive p-1 self-start" aria-label="Remove"><Trash2 size={14} /></button>
                </div>
              );
            })
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            {total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-mono uppercase tracking-widest text-muted-foreground text-[10px]">Estimated total</span>
                <span className="font-extrabold text-lg">{formatPrice(total, "USD")}</span>
              </div>
            )}
            <button onClick={orderAll} className="w-full bg-[#25D366] text-white font-bold uppercase tracking-widest py-3.5 rounded-md flex items-center justify-center gap-2 hover:brightness-110">
              <MessageCircle size={18} /> Order all via WhatsApp
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
