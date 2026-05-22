import { Product, SiteSettings, thumbUrl, formatPrice } from "@/lib/catalog";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface Props {
  product: Product;
  settings: SiteSettings;
  brandName?: string;
  onClick: () => void;
}

export const ProductCard = ({ product, settings, brandName, onClick }: Props) => {
  const [imgIdx, setImgIdx] = useState(0);
  const cart = useCart();
  const imgs = product.images ?? [];
  const main = imgs[imgIdx] ?? imgs[0];
  const inCart = cart.hasProduct(product.id);

  return (
    <div
      className="group relative bg-card border border-border hover:border-accent transition-colors overflow-hidden rounded-md"
      onMouseEnter={() => imgs.length > 1 && setImgIdx(1)}
      onMouseLeave={() => setImgIdx(0)}
    >
      <button onClick={onClick} className="block w-full text-left">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {main && (
            <img
              src={thumbUrl(main.url, settings.image_base_url, 480)}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.sort_order < 5 && (
              <span className="bg-foreground text-background text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono">
                Top Batch
              </span>
            )}
            {imgs.length > 1 && (
              <span className="bg-white/90 backdrop-blur border border-border text-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-sm font-mono">
                {imgs.length} IMG
              </span>
            )}
          </div>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-mono text-muted-foreground mb-0.5 uppercase tracking-tight truncate">
            {brandName ?? "—"} · #SL-{product.id.slice(0, 6).toUpperCase()}
          </p>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 h-10 group-hover:text-accent transition-colors">
            {product.title}
          </h3>
          <div className="mt-3 flex items-baseline justify-between">
            {product.whatsapp_only ? (
              <span className="text-sm font-bold text-accent">On WhatsApp</span>
            ) : product.price ? (
              <span className="text-sm font-bold">{formatPrice(product.price, product.currency)}</span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground">MOQ: 1</span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full shadow-md transition ${
          inCart ? "bg-foreground text-background" : "bg-white text-foreground border border-border hover:bg-foreground hover:text-background"
        }`}
        aria-label="Add"
      >
        {inCart ? <Check size={14} /> : <Plus size={14} />}
      </button>
    </div>
  );
};
