import { Product, SiteSettings, resolveImageUrl, thumbUrl, buildWhatsappUrl, formatPrice, defaultSizesFor } from "@/lib/catalog";
import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, MessageCircle, Share2, ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useCart } from "@/hooks/useCart";

interface Props {
  product: Product | null;
  brandName?: string;
  categoryName?: string;
  settings: SiteSettings;
  onClose: () => void;
}

export const ProductModal = ({ product, brandName, categoryName, settings, onClose }: Props) => {
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const touchStart = useRef<number | null>(null);
  const cart = useCart();

  useScrollLock(!!product);
  useEffect(() => {
    setIdx(0);
    setSize("");
    setColor("");
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      const len = product.images?.length || 1;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + len) % len);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % len);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, product]);

  if (!product) return null;
  const imgs = product.images ?? [];
  const savedSizes = product.sizes ?? [];
  const sizes = savedSizes.length > 0 ? savedSizes.map((s) => s.size) : defaultSizesFor(categoryName);
  const colors = product.colors ?? [];
  const len = imgs.length || 1;

  const next = () => setIdx((idx + 1) % len);
  const prev = () => setIdx((idx - 1 + len) % len);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
    }
    touchStart.current = null;
  };

  const order = () => {
    if (sizes.length > 0 && !size) return toast.error("Please choose a size first");
    if (colors.length > 0 && !color) return toast.error("Please choose a color first");
    const lines = ["Hi SHENLONG 神龙,", "", "I'd like to order:", `• ${brandName ? brandName + " — " : ""}${product.title}`];
    if (color) lines.push(`• Color: ${color}`);
    if (size) lines.push(`• Size: ${size}`);
    if (!product.whatsapp_only && product.price) lines.push(`• Price: ${formatPrice(product.price, product.currency)}`);
    lines.push("", "Thanks!");
    window.open(buildWhatsappUrl(settings.whatsapp_number, lines.join("\n")), "_blank", "noopener");
  };

  const share = async () => {
    const url = `${window.location.origin}/?p=${product.id}`;
    try {
      if (navigator.share) await navigator.share({ title: product.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  };

  const addToCart = () => {
    if (sizes.length > 0 && !size) return toast.error("Please choose a size first");
    if (colors.length > 0 && !color) return toast.error("Please choose a color first");
    cart.add({ id: product.id, size: size || undefined, color: color || undefined });
    toast.success("Added to cart");
  };
  const inCart = cart.hasProduct(product.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-stretch md:items-center justify-center md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card w-full md:max-w-5xl md:max-h-[92vh] flex flex-col md:flex-row overflow-hidden md:rounded-xl shadow-2xl h-[100dvh] md:h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono truncate">
            {brandName} {categoryName && `· ${categoryName}`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={share} className="p-2 hover:text-accent" aria-label="Share"><Share2 size={18} /></button>
            <button onClick={onClose} className="p-2 hover:text-accent" aria-label="Close"><X size={20} /></button>
          </div>
        </div>

        <div
          className="md:w-3/5 bg-surface-muted relative flex items-center justify-center select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-full h-[42vh] md:h-[78vh] flex items-center justify-center overflow-hidden">
            {imgs[idx] && (
              <img
                src={resolveImageUrl(imgs[idx].url, settings.image_base_url)}
                alt={product.title}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            )}
          </div>
          {imgs.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white border border-border text-foreground w-10 h-10 rounded-full grid place-items-center hover:bg-foreground hover:text-background transition shadow" aria-label="Previous"><ChevronLeft size={18} /></button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white border border-border text-foreground w-10 h-10 rounded-full grid place-items-center hover:bg-foreground hover:text-background transition shadow" aria-label="Next"><ChevronRight size={18} /></button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 border border-border text-foreground text-[11px] font-mono px-2.5 py-0.5 rounded-full">
                {idx + 1} / {imgs.length}
              </div>
            </>
          )}
        </div>

        <div className="md:w-2/5 flex flex-col min-h-0 flex-1">
          <div className="hidden md:flex items-center justify-between p-4 border-b border-border shrink-0">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono truncate">
              {brandName} {categoryName && `· ${categoryName}`}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={share} className="p-1.5 hover:text-accent" aria-label="Share"><Share2 size={16} /></button>
              <button onClick={onClose} className="p-1.5 hover:text-accent" aria-label="Close"><X size={18} /></button>
            </div>
          </div>

          <div className="p-5 overflow-y-auto flex-1 min-h-0">
            <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-widest">
              #SL-{product.id.slice(0, 8).toUpperCase()}
            </p>
            <h2 className="text-2xl font-bold tracking-tight mb-2 leading-tight">{product.title}</h2>
            {product.description && <p className="text-sm text-muted-foreground mb-4">{product.description}</p>}
            <div className="mb-6 pb-6 border-b border-border">
              {product.whatsapp_only ? (
                <div className="text-xl font-bold text-accent">Price on WhatsApp</div>
              ) : product.price ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-accent">{formatPrice(product.price, product.currency)}</span>
                  <span className="text-xs font-mono text-muted-foreground">MOQ: 1 unit</span>
                </div>
              ) : null}
            </div>

            {colors.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                  Color {color && <span className="text-foreground normal-case tracking-normal">· {color}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.name)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border-2 transition ${color === c.name ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"}`}
                    >
                      {c.hex && <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: c.hex }} />}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                  Size {size && <span className="text-foreground normal-case tracking-normal">· {size}</span>}
                  {!size && <span className="ml-1 text-accent normal-case tracking-normal">— required</span>}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {sizes.map((sv) => (
                    <button
                      key={sv}
                      onClick={() => setSize(sv)}
                      className={`h-11 text-sm font-bold rounded-md border-2 transition ${size === sv ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:border-foreground/40"}`}
                    >
                      {sv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {imgs.length > 1 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-mono">Photos</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {imgs.map((im, i) => (
                    <button
                      key={im.id}
                      onClick={() => setIdx(i)}
                      className={`aspect-square overflow-hidden rounded-sm border-2 transition ${i === idx ? "border-foreground" : "border-transparent hover:border-border"}`}
                    >
                      <img src={thumbUrl(im.url, settings.image_base_url, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-0 shrink-0 border-t border-border">
            <button onClick={order} className="bg-[#25D366] text-white font-bold uppercase tracking-widest py-4 text-sm hover:brightness-110 transition flex items-center justify-center gap-2">
              <MessageCircle size={18} /> Order via WhatsApp
            </button>
            <button onClick={addToCart} className={`px-5 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 transition ${inCart ? "bg-accent text-accent-foreground hover:brightness-110" : "bg-foreground text-background hover:bg-accent"}`}>
              {inCart ? <><Check size={16} /> Add more</> : <><ShoppingBag size={16} /> Add</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
