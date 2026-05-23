import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import {
  Brand,
  Category,
  Product,
  SiteSettings,
  fetchBrands,
  fetchCategories,
  fetchProducts,
  fetchSettings,
} from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductModal } from "@/components/catalog/ProductModal";
import { CartDrawer } from "@/components/catalog/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { Search, ShoppingBag, Menu, X, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Shenlong Market — Precision Wholesale 神龍市場" },
      {
        name: "description",
        content:
          "Shenlong Market 神龍 — premium Japan-based sourcing. Direct supplier catalog, sneakers, electronics, accessories. Order via WhatsApp.",
      },
    ],
  }),
});

const PAGE_SIZE = 48;

function Index() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    whatsapp_number: "+12532237370",
    tracking_url: "https://neocartrige.com",
    image_base_url: "",
  });
  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("featured");
  const [open, setOpen] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [cartOpen, setCartOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    Promise.all([fetchBrands(), fetchCategories(), fetchSettings()]).then(([b, c, s]) => {
      setBrands(b);
      setCategories(c);
      setSettings(s);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setVisible(PAGE_SIZE);
    fetchProducts({ brandId, categoryId, search: debounced }).then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, [brandId, categoryId, debounced]);

  useEffect(() => {
    setCategoryId(null);
  }, [brandId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("p");
    if (p)
      fetchProducts({}).then((arr) => {
        const found = arr.find((x) => x.id === p);
        if (found) setOpen(found);
      });
  }, []);

  const brandCats = useMemo(
    () => (brandId ? categories.filter((c) => c.brand_id === brandId) : []),
    [brandId, categories],
  );
  const currentBrand = brands.find((b) => b.id === brandId);

  const sorted = useMemo(() => {
    const arr = [...products];
    if (sort === "priceLow") arr.sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
    else if (sort === "priceHigh") arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (sort === "az") arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "za") arr.sort((a, b) => b.title.localeCompare(a.title));
    return arr;
  }, [products, sort]);

  const brandLookup = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.name])),
    [brands],
  );
  const catLookup = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const shown = sorted.slice(0, visible);
  const heading = currentBrand ? currentBrand.name : debounced ? `Search: "${debounced}"` : "Latest Shipments";

  return (
    <div className="min-h-screen bg-surface-muted text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`w-72 bg-background border-r border-border flex flex-col shrink-0 fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 transition-transform lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-sm">神龍</span>
              <span>SHENLONG</span>
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-1">PRECISION WHOLESALE</p>
          </div>
          <button onClick={() => setNavOpen(false)} className="lg:hidden p-2" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          <section>
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">
              Navigation
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    setBrandId(null);
                    setSearch("");
                    setNavOpen(false);
                  }}
                  className={`w-full text-left px-2 py-2 text-sm font-medium rounded-md transition ${
                    !brandId ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All Brands
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">
              Brands Catalog
            </h3>
            <ul className="space-y-0.5">
              {brands.map((b) => {
                const count = products.filter((p) => p.brand_id === b.id).length;
                const active = brandId === b.id;
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => {
                        setBrandId(b.id);
                        setNavOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition ${
                        active ? "bg-accent/10 text-accent font-semibold" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {!active && count > 0 && (
                        <span className="text-[10px] font-mono bg-muted px-1.5 rounded text-muted-foreground">
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="bg-surface-muted border border-border p-3 rounded-lg">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Live Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium">Tokyo Hub · Shipping</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>© SHENLONG 神龍</span>
            <a href="/auth" className="hover:text-accent">Contact</a>
            <a href="/auth?admin=1" className="hover:text-accent">Admin</a>
          </div>
        </div>
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setNavOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-background/80 backdrop-blur border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 -ml-2" aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="relative max-w-md w-full">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog (SKU, brand, style…)"
                className="w-full bg-surface-muted border border-border rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <span className="hidden md:inline text-[11px] font-mono text-muted-foreground">
              {sorted.length} items
            </span>
            <a
              href={`https://wa.me/${settings.whatsapp_number.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noopener"
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest bg-foreground text-background px-3 py-1.5 rounded-full hover:bg-accent transition"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 lg:px-8 pt-8 pb-6">
          <div className="relative border border-border bg-background rounded-xl p-8 lg:p-12 overflow-hidden">
            <span className="absolute top-4 right-6 lg:right-12 text-[140px] lg:text-[200px] leading-none font-extrabold text-foreground/[0.04] select-none pointer-events-none">
              神龍
            </span>
            <div className="relative max-w-2xl">
              <span className="inline-block px-2 py-1 bg-foreground text-background text-[10px] font-mono mb-4 rounded-sm">
                Q4 · 2026 SHIPMENT
              </span>
              <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tighter leading-[0.95] mb-4">
                {heading}
              </h2>
              <p className="text-sm lg:text-base text-muted-foreground max-w-lg mb-6">
                {currentBrand
                  ? `Direct procurement pipeline · ${sorted.length} reference(s) in stock.`
                  : "Direct procurement from our Tokyo & Osaka hubs. Click any product to order via WhatsApp."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener"
                  className="bg-accent text-accent-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-md hover:brightness-110 transition flex items-center gap-2"
                >
                  <MessageCircle size={14} /> Contact an agent
                </a>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  · Reply &lt; 10 min
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile brand chip bar — full catalog access without opening the drawer */}
        <div className="lg:hidden sticky top-14 z-20 bg-background border-b border-border">
          <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
            <button
              onClick={() => setBrandId(null)}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                !brandId
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border hover:border-foreground/40"
              }`}
            >
              All
            </button>
            {brands.map((b) => {
              const active = brandId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setBrandId(b.id)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition whitespace-nowrap ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border hover:border-foreground/40"
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
          {brandId && brandCats.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 no-scrollbar border-t border-border/60 pt-2">
              <button
                onClick={() => setCategoryId(null)}
                className={`shrink-0 px-2.5 py-1 text-[11px] font-mono uppercase tracking-widest rounded-md border transition ${
                  !categoryId
                    ? "bg-accent/10 text-accent border-accent/40"
                    : "bg-background text-muted-foreground border-border"
                }`}
              >
                All cats
              </button>
              {brandCats.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={`shrink-0 px-2.5 py-1 text-[11px] font-mono uppercase tracking-widest rounded-md border transition whitespace-nowrap ${
                      active
                        ? "bg-accent/10 text-accent border-accent/40"
                        : "bg-background text-muted-foreground border-border"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="sticky top-14 lg:top-14 z-20 bg-surface-muted/95 backdrop-blur border-y border-border px-4 lg:px-8 py-3 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mr-2">
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-background border border-border text-xs font-medium rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="featured">Featured</option>
            <option value="priceLow">Price ↑</option>
            <option value="priceHigh">Price ↓</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>

          {brandId && brandCats.length > 0 && (
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="hidden lg:block bg-background border border-border text-xs font-medium rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All categories</option>
              {brandCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto text-[10px] font-mono text-muted-foreground">
            Updated · live inventory
          </div>
        </div>

        {/* Grid */}
        <section className="flex-1 px-4 lg:px-8 py-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <div className="text-6xl font-extrabold text-muted mb-3">无</div>
              <p>No products found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {shown.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    settings={settings}
                    brandName={brandLookup[p.brand_id]}
                    onClick={() => setOpen(p)}
                  />
                ))}
              </div>
              {visible < sorted.length && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="bg-foreground text-background px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-accent transition"
                  >
                    Load more ({sorted.length - visible} left)
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="bg-background border-t border-border px-4 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>© SHENLONG MARKET · 神龍市場</span>
          <span>All orders via WhatsApp</span>
        </footer>
      </main>

      {/* Floating cart */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-foreground text-background pl-5 pr-6 h-14 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition"
        aria-label="Open cart"
      >
        <ShoppingBag size={18} />
        <span className="text-[10px] font-mono uppercase tracking-widest leading-none">Cart</span>
        <span className="bg-accent text-accent-foreground text-[10px] font-extrabold rounded-full min-w-6 h-6 px-2 grid place-items-center">
          {cart.totalQty}
        </span>
      </button>

      <ProductModal
        product={open}
        brandName={open ? brandLookup[open.brand_id] : undefined}
        categoryName={open ? catLookup[open.category_id] : undefined}
        settings={settings}
        onClose={() => setOpen(null)}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} settings={settings} brandLookup={brandLookup} />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
