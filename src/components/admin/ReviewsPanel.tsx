import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Review, deleteReview, fetchReviews, uploadReview } from "@/lib/catalog";

export function ReviewsPanel() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchReviews());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) await uploadReview(f);
      toast.success(`${files.length} review(s) added`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (r: Review) => {
    if (!confirm("Delete this review photo?")) return;
    try {
      await deleteReview(r.path);
      setItems((cur) => cur.filter((x) => x.path !== r.path));
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="font-extrabold text-xl mb-1">Client Reviews</h1>
      <p className="text-xs text-muted-foreground mb-4">
        Photos shown in the "Are we legit?" strip on the home page.
      </p>

      <label className="inline-flex items-center gap-2 bg-foreground text-background text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-md cursor-pointer hover:bg-accent transition mb-5">
        <Upload size={13} />
        {busy ? "Uploading…" : "Add photos"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No review photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((r) => (
            <div key={r.path} className="relative group rounded-md overflow-hidden border border-border bg-background">
              <img src={r.url} alt="Review" className="w-full aspect-[3/4] object-cover" />
              <button
                onClick={() => remove(r)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1.5 rounded-md opacity-90"
                aria-label="Delete review"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
