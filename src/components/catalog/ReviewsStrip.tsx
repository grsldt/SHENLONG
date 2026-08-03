import { useEffect, useState } from "react";
import { Review, fetchReviews } from "@/lib/catalog";

export function ReviewsStrip() {
  const [items, setItems] = useState<Review[]>([]);
  const [zoom, setZoom] = useState<Review | null>(null);

  useEffect(() => {
    fetchReviews().then(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="px-4 lg:px-8 pb-2">
      <div className="mb-2">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground">
          Are we legit?
        </h3>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x">
        {items.map((r) => (
          <button
            key={r.path}
            onClick={() => setZoom(r)}
            className="shrink-0 snap-start w-24 h-32 sm:w-28 sm:h-36 rounded-md overflow-hidden border border-border bg-background hover:border-accent transition"
          >
            <img
              src={r.url}
              alt="Client review screenshot"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[60] bg-foreground/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom.url}
            alt="Client review screenshot"
            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}
