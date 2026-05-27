import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Brand, Category, Product, SiteSettings,
  fetchBrands, fetchCategories, fetchProducts, fetchSettings,
  resolveImageUrl, formatPrice,
} from "@/lib/catalog";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, LogOut, Upload, X, ChevronUp, ChevronDown, Settings as SettingsIcon, Mail, Menu } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin · Shenlong Market" }] }),
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const inputCls = "w-full bg-surface-muted px-3 py-2 border border-border rounded-md focus:outline-none focus:border-accent text-sm";
const cardCls = "bg-background border border-border rounded-xl";
const chipBtn = "px-4 py-2 border border-border rounded-md text-xs uppercase tracking-widest hover:bg-surface-muted";
const primaryBtn = "bg-foreground text-background px-5 py-2 text-xs uppercase tracking-widest font-bold rounded-md hover:bg-accent disabled:opacity-50";

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useScrollLock(true);
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-foreground/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className={`${cardCls} w-full max-w-sm pointer-events-auto`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-extrabold text-base">{title}</h3>
            <button onClick={onClose} className="hover:text-accent"><X size={18} /></button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </>
  );
}

function PromptModal({ title, label, placeholder, defaultValue = "", onSubmit, onClose }: { title: string; label?: string; placeholder?: string; defaultValue?: string; onSubmit: (v: string) => void; onClose: () => void; }) {
  const [v, setV] = useState(defaultValue);
  return (
    <Modal title={title} onClose={onClose}>
      {label && <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</label>}
      <input autoFocus value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onSubmit(v.trim()); onClose(); } }} className={inputCls} />
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className={chipBtn}>Cancel</button>
        <button disabled={!v.trim()} onClick={() => { onSubmit(v.trim()); onClose(); }} className={primaryBtn}>OK</button>
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, message, danger, onConfirm, onClose }: { title: string; message: string; danger?: boolean; onConfirm: () => void; onClose: () => void; }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-foreground/90">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className={chipBtn}>Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }}
          className={`px-5 py-2 text-xs uppercase tracking-widest font-bold rounded-md ${danger ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"}`}>Confirm</button>
      </div>
    </Modal>
  );
}

function HexPicker({ onPick, onSkip }: { onPick: (hex: string) => void; onSkip: () => void }) {
  const [hex, setHex] = useState("#000000");
  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="w-14 h-10 border border-border rounded bg-background" />
        <input value={hex} onChange={(e) => setHex(e.target.value)} className={`${inputCls} font-mono`} />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onSkip} className={chipBtn}>Skip</button>
        <button onClick={() => onPick(hex)} className={primaryBtn}>Save color</button>
      </div>
    </div>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [view, setView] = useState<"products" | "messages" | "settings">("products");
  const [unread, setUnread] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth", search: { admin: "1" } }); return; }
      setUserEmail(session.user.email ?? "");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      setAuthChecked(true);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth", search: { admin: "1" } });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const reload = useCallback(async () => {
    const [b, c, s] = await Promise.all([fetchBrands(), fetchCategories(), fetchSettings()]);
    setBrands(b); setCategories(c); setSettings(s);
  }, []);

  useEffect(() => { if (isAdmin) reload(); }, [isAdmin, reload]);

  useEffect(() => {
    if (brands.length > 0 && !brandId) setBrandId(brands[0].id);
  }, [brands, brandId]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = () => supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false).then(({ count }) => setUnread(count ?? 0));
    load();
    const ch = supabase.channel("msgs").on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!brandId) { setProducts([]); return; }
    let cancelled = false;
    setProducts([]);
    fetchProducts({ brandId, categoryId }).then((p) => { if (!cancelled) setProducts(p); });
    return () => { cancelled = true; };
  }, [brandId, categoryId, isAdmin]);

  if (!authChecked) return <div className="min-h-screen bg-surface-muted flex items-center justify-center text-muted-foreground">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
        <Toaster richColors position="top-center" />
        <div className={`${cardCls} p-8 max-w-md`}>
          <h1 className="font-extrabold text-2xl mb-2">Access Restricted 禁止</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You're signed in as <span className="font-mono text-foreground">{userEmail}</span> but you don't have admin rights.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            To grant admin access, the owner must run this SQL once in the backend:
          </p>
          <pre className="text-[11px] bg-surface-muted p-3 rounded-md overflow-x-auto mb-4">{`INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = '${userEmail}'),
  'admin'
);`}</pre>
          <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth", search: { admin: "1" } }); }}
            className="w-full bg-foreground text-background font-bold uppercase tracking-widest py-2.5 rounded-md hover:bg-accent">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const reloadProducts = () => fetchProducts({ brandId, categoryId }).then(setProducts);

  return (
    <div className="min-h-screen md:flex bg-surface-muted">
      <Toaster richColors position="top-center" />
      {/* Mobile topbar */}
      <div className="md:hidden sticky top-0 z-30 bg-background border-b border-border flex items-center justify-between px-3 py-2">
        <button onClick={() => setNavOpen(true)} aria-label="Menu" className="p-2 -ml-2"><Menu size={20} /></button>
        <div className="text-xs uppercase tracking-widest font-bold">Admin · {view}</div>
        <button onClick={() => navigate({ to: "/" })} className="text-[10px] uppercase tracking-widest p-2">Site →</button>
      </div>

      {navOpen && <div className="fixed inset-0 z-40 bg-foreground/40 md:hidden" onClick={() => setNavOpen(false)} aria-hidden />}

      {/* Sidebar */}
      <aside className={`bg-background border-r border-border flex flex-col overflow-hidden
        fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[260px] transform transition-transform duration-300
        ${navOpen ? "translate-x-0" : "-translate-x-full"}
        md:static md:translate-x-0 md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-sm font-extrabold">神龙</span>
            <div>
              <div className="font-extrabold tracking-tight text-sm">SHENLONG</div>
              <div className="text-[9px] font-mono text-muted-foreground tracking-widest">ADMIN CONSOLE</div>
            </div>
          </div>
          <button onClick={() => setNavOpen(false)} className="md:hidden p-1 hover:text-accent" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border min-w-0">
          <div>Signed in</div>
          <div className="truncate normal-case tracking-normal text-foreground" title={userEmail}>{userEmail}</div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <button onClick={() => { setView("messages"); setNavOpen(false); }}
            className={`w-full text-left px-3 py-2.5 text-xs font-bold uppercase tracking-widest border-b border-border flex items-center justify-between ${view === "messages" ? "bg-foreground text-background" : "hover:bg-surface-muted"}`}>
            <span><Mail size={11} className="inline mr-1.5" />Messages</span>
            {unread > 0 && <span className="bg-accent text-accent-foreground text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{unread}</span>}
          </button>
          <button onClick={() => { setView("settings"); setNavOpen(false); }}
            className={`w-full text-left px-3 py-2.5 text-xs font-bold uppercase tracking-widest border-b border-border ${view === "settings" ? "bg-foreground text-background" : "hover:bg-surface-muted"}`}>
            <SettingsIcon size={11} className="inline mr-1.5" />Settings
          </button>

          {view === "products" && (
            <>
              <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground flex justify-between items-center">
                <span>Brands ({brands.length})</span>
                <button onClick={() => setShowAddBrand(true)} className="text-accent hover:opacity-80" aria-label="Add brand"><Plus size={14} /></button>
              </div>
              {brands.map((b) => (
                <button key={b.id} onClick={() => { setBrandId(b.id); setCategoryId(null); setNavOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs border-b border-border/40 ${brandId === b.id ? "bg-foreground text-background" : "hover:bg-surface-muted"}`}>
                  {b.name}
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="p-2 border-t border-border space-y-1.5">
          <button onClick={() => navigate({ to: "/" })}
            className="w-full text-[10px] uppercase tracking-widest bg-surface-muted py-1.5 rounded hover:bg-foreground hover:text-background">View Site →</button>
          <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
            className="w-full text-[10px] uppercase tracking-widest bg-surface-muted py-1.5 rounded hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center gap-1">
            <LogOut size={11} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden min-w-0">
        {view === "settings" && settings ? (
          <SettingsPanel settings={settings} onSaved={reload} />
        ) : view === "messages" ? (
          <MessagesPanel />
        ) : (
          <ProductsPanel brands={brands} categories={categories} products={products} brandId={brandId} categoryId={categoryId}
            onCategoryChange={setCategoryId} settings={settings} onReload={() => { reload(); reloadProducts(); }} />
        )}
      </main>
      {showAddBrand && (
        <PromptModal title="New brand" label="Brand name" placeholder="e.g. Arcteryx"
          onSubmit={async (name) => {
            const slug = slugify(name);
            const { error } = await supabase.from("brands").insert({ name, slug });
            if (error) { toast.error(error.message); return; }
            toast.success("Brand added"); reload();
          }} onClose={() => setShowAddBrand(false)} />
      )}
    </div>
  );
}

// ============== Messages panel ==============
function MessagesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string, read: boolean) => {
    await supabase.from("contact_messages").update({ read }).eq("id", id);
    setItems((cur) => cur.map((m) => m.id === id ? { ...m, read } : m));
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("contact_messages").delete().eq("id", id);
    setItems((cur) => cur.filter((m) => m.id !== id));
  };

  const list = filter === "unread" ? items.filter((m) => !m.read) : items;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold">Messages</h1>
        <div className="flex gap-2 text-xs uppercase tracking-widest">
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-md border border-border ${filter === "all" ? "bg-foreground text-background" : "bg-background"}`}>All ({items.length})</button>
          <button onClick={() => setFilter("unread")} className={`px-3 py-1.5 rounded-md border border-border ${filter === "unread" ? "bg-foreground text-background" : "bg-background"}`}>Unread ({items.filter((m) => !m.read).length})</button>
        </div>
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">客户消息 · Customer enquiries</p>

      {loading ? <p className="text-muted-foreground">Loading...</p> : list.length === 0 ? (
        <p className="text-muted-foreground">No messages.</p>
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className={`${cardCls} p-4 ${!m.read ? "border-l-4 border-l-accent" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-2 flex-wrap">
                    {m.name}
                    {!m.read && <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded uppercase tracking-widest">New</span>}
                  </div>
                  <div className="text-xs text-muted-foreground break-all">
                    <a href={`mailto:${m.email}`} className="hover:text-accent">{m.email}</a>
                    {m.phone && <> · <a href={`tel:${m.phone}`} className="hover:text-accent">{m.phone}</a></>}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
              {m.subject && <div className="text-sm font-semibold mb-1">{m.subject}</div>}
              <p className="text-sm whitespace-pre-wrap text-foreground/90 mb-3">{m.message}</p>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                <a href={`mailto:${m.email}?subject=Re:%20${encodeURIComponent(m.subject || "Your enquiry")}`} className="px-3 py-1.5 rounded-md bg-foreground text-background hover:bg-accent">Reply by email</a>
                <button onClick={() => markRead(m.id, !m.read)} className={chipBtn}>Mark as {m.read ? "unread" : "read"}</button>
                <button onClick={() => remove(m.id)} className="px-3 py-1.5 text-destructive hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== Settings panel ==============
function SettingsPanel({ settings, onSaved }: { settings: SiteSettings; onSaved: () => void }) {
  const [s, setS] = useState(settings);
  const save = async () => {
    const { error } = await supabase.from("site_settings").update({ tracking_url: s.tracking_url, image_base_url: s.image_base_url }).eq("id", 1);
    if (error) toast.error(error.message); else { toast.success("Saved"); onSaved(); }
  };
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold mb-1">Site Settings</h1>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">网站设置</p>
      <div className={`space-y-4 ${cardCls} p-6`}>
        <Field label="WhatsApp number (with +)" value={s.whatsapp_number} onChange={(v) => setS({ ...s, whatsapp_number: v })} />
        <Field label="Tracking URL" value={s.tracking_url} onChange={(v) => setS({ ...s, tracking_url: v })} />
        <Field label="Image base URL (where your local /catalog/ images live)" value={s.image_base_url} onChange={(v) => setS({ ...s, image_base_url: v })} placeholder="/catalog/  or  https://your-host.com/" />
        <p className="text-xs text-muted-foreground">
          Leave the image base URL empty to use <code className="bg-surface-muted px-1 rounded">/catalog/</code> at your site root.
        </p>
        <button onClick={save} className={`${primaryBtn} px-6 py-2.5`}>Save</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</label>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

// ============== Products panel ==============
function ProductsPanel({ brands, categories, products, brandId, categoryId, onCategoryChange, settings, onReload }: any) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddProd, setShowAddProd] = useState(false);
  const [pickCatThenTitle, setPickCatThenTitle] = useState<{ catId: string } | null>(null);
  const [confirmDelBrand, setConfirmDelBrand] = useState(false);
  const [confirmDelCat, setConfirmDelCat] = useState(false);
  const brand = brands.find((b: Brand) => b.id === brandId);
  const brandCats = brandId ? categories.filter((c: Category) => c.brand_id === brandId) : [];
  const currentCat = brandCats.find((c: Category) => c.id === categoryId);

  const startNewProduct = () => {
    if (!brandId) { toast.error("Pick a brand from the sidebar first"); return; }
    if (brandCats.length === 0) { toast.error("Create a category first (+ Category)"); return; }
    if (categoryId) { setPickCatThenTitle({ catId: categoryId }); return; }
    if (brandCats.length === 1) { setPickCatThenTitle({ catId: brandCats[0].id }); return; }
    setShowAddProd(true);
  };

  const createProduct = async (catId: string, title: string) => {
    const { data, error } = await supabase.from("products").insert({
      brand_id: brandId, category_id: catId, title, price: 15, currency: "USD"
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Product created");
    onReload();
    setEditing(data as any);
  };

  const deleteCategory = async () => {
    if (!currentCat) return;
    await supabase.from("categories").delete().eq("id", currentCat.id);
    toast.success("Category deleted");
    onCategoryChange(null);
    onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl md:text-3xl font-extrabold truncate">{brand ? brand.name : ""}</h1>
        {brand && <button onClick={() => setConfirmDelBrand(true)} className="text-destructive text-xs uppercase tracking-widest hover:underline shrink-0 ml-2">Delete brand</button>}
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
        {brand ? `${products.length} item${products.length !== 1 ? "s" : ""}` : ""}
      </p>

      {brandId && (
        <div className="flex flex-wrap gap-2 mb-6">
          <select value={categoryId ?? ""} onChange={(e) => onCategoryChange(e.target.value || null)} className="bg-background px-3 py-2 border border-border rounded-md text-sm min-w-[140px]">
            <option value="">All categories</option>
            {brandCats.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {currentCat && (
            <button onClick={() => setConfirmDelCat(true)} className="text-xs uppercase tracking-widest bg-background border border-border rounded-md px-3 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 size={12} className="inline mr-1" />Cat.
            </button>
          )}
          <button onClick={() => setShowAddCat(true)} className="text-xs uppercase tracking-widest bg-background border border-border rounded-md px-3 py-2 hover:bg-foreground hover:text-background">
            <Plus size={12} className="inline mr-1" />Category
          </button>
          <button onClick={startNewProduct} className="text-xs uppercase tracking-widest bg-foreground text-background rounded-md px-4 py-2 hover:bg-accent">
            <Plus size={12} className="inline mr-1" />New Product
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((p: Product) => (
          <button key={p.id} onClick={() => setEditing(p)} className={`text-left ${cardCls} overflow-hidden hover:border-accent transition group`}>
            <div className="aspect-square bg-surface-muted overflow-hidden">
              {p.images?.[0] && <img src={resolveImageUrl(p.images[0].url, settings?.image_base_url ?? "")} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />}
            </div>
            <div className="p-2">
              <div className="font-bold text-sm truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{p.whatsapp_only ? "WhatsApp" : p.price ? formatPrice(p.price, p.currency) : "—"}</span>
                <span>{p.images?.length ?? 0} 图</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {editing && <ProductEditor product={editing} settings={settings} onClose={() => { setEditing(null); onReload(); }} />}

      {showAddCat && (
        <PromptModal title="New category" label="Category name" placeholder="e.g. Shoes, T-shirts, Jackets"
          onSubmit={async (name) => {
            const { error } = await supabase.from("categories").insert({ brand_id: brandId, name, slug: slugify(name) });
            if (error) { toast.error(error.message); return; }
            toast.success("Category added"); onReload();
          }} onClose={() => setShowAddCat(false)} />
      )}

      {showAddProd && (
        <Modal title="Pick a category" onClose={() => setShowAddProd(false)}>
          <p className="text-xs text-muted-foreground mb-3">Choose where this product belongs:</p>
          <div className="flex flex-wrap gap-2">
            {brandCats.map((c: Category) => (
              <button key={c.id} onClick={() => { setShowAddProd(false); setPickCatThenTitle({ catId: c.id }); }}
                className="px-3 py-2 border border-border rounded-md text-sm bg-background hover:bg-foreground hover:text-background">{c.name}</button>
            ))}
          </div>
        </Modal>
      )}

      {pickCatThenTitle && (
        <PromptModal title="New product" label="Product title" placeholder="e.g. Beta SL Jacket"
          onSubmit={(title) => createProduct(pickCatThenTitle.catId, title)} onClose={() => setPickCatThenTitle(null)} />
      )}

      {confirmDelBrand && brand && (
        <ConfirmModal title="Delete brand" message={`Delete brand "${brand.name}" and ALL its products? This cannot be undone.`} danger
          onConfirm={async () => {
            await supabase.from("brands").delete().eq("id", brand.id);
            toast.success("Brand deleted"); onReload();
          }} onClose={() => setConfirmDelBrand(false)} />
      )}

      {confirmDelCat && currentCat && (
        <ConfirmModal title="Delete category" message={`Delete category "${currentCat.name}" and ALL its products?`} danger
          onConfirm={deleteCategory} onClose={() => setConfirmDelCat(false)} />
      )}
    </div>
  );
}

// ============== Product editor ==============
function ProductEditor({ product, settings, onClose }: { product: Product; settings: SiteSettings | null; onClose: () => void }) {
  const [p, setP] = useState<Product>(product);
  const [imgs, setImgs] = useState(product.images ?? []);
  const [sizes, setSizes] = useState(product.sizes ?? []);
  const [colors, setColors] = useState(product.colors ?? []);
  const [busy, setBusy] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [showAddSize, setShowAddSize] = useState(false);
  const [colorStep, setColorStep] = useState<{ name: string } | null>(null);
  const [showAddColor, setShowAddColor] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  useScrollLock(true);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("products").update({
      title: p.title, description: p.description, price: p.price, price_label: p.price_label,
      whatsapp_only: p.whatsapp_only, currency: p.currency,
    }).eq("id", p.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); onClose();
  };

  const del = async () => {
    await supabase.from("products").delete().eq("id", p.id);
    toast.success("Deleted"); onClose();
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const path = `${p.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const next = imgs.length;
      const { data } = await supabase.from("product_images").insert({ product_id: p.id, url: `storage://${path}`, sort_order: next }).select().single();
      if (data) setImgs((cur) => [...cur, data as any]);
    }
    setBusy(false);
  };

  const addUrlImage = async (url: string) => {
    const next = imgs.length;
    const { data, error } = await supabase.from("product_images").insert({ product_id: p.id, url, sort_order: next }).select().single();
    if (error) { toast.error(error.message); return; }
    setImgs((cur) => [...cur, data as any]);
  };

  const removeImg = async (id: string) => {
    await supabase.from("product_images").delete().eq("id", id);
    setImgs((cur) => cur.filter((i) => i.id !== id));
  };

  const moveImg = async (id: string, dir: -1 | 1) => {
    const i = imgs.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= imgs.length) return;
    const next = [...imgs]; [next[i], next[j]] = [next[j], next[i]];
    setImgs(next);
    await Promise.all(next.map((im, idx) => supabase.from("product_images").update({ sort_order: idx }).eq("id", im.id)));
  };

  const addSize = async (s: string) => {
    const { data, error } = await supabase.from("product_sizes").insert({ product_id: p.id, size: s, sort_order: sizes.length }).select().single();
    if (error) { toast.error(error.message); return; }
    setSizes((cur) => [...cur, data as any]);
  };
  const removeSize = async (id: string) => {
    await supabase.from("product_sizes").delete().eq("id", id);
    setSizes((cur) => cur.filter((s) => s.id !== id));
  };

  const addColor = async (name: string, hex: string | null) => {
    const { data, error } = await supabase.from("product_colors").insert({ product_id: p.id, name, hex, sort_order: colors.length }).select().single();
    if (error) { toast.error(error.message); return; }
    setColors((cur) => [...cur, data as any]);
  };
  const removeColor = async (id: string) => {
    await supabase.from("product_colors").delete().eq("id", id);
    setColors((cur) => cur.filter((c) => c.id !== id));
  };

  return (
    <>
      <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div className={`${cardCls} w-full max-w-3xl pointer-events-auto my-8`}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-extrabold text-xl">Edit Product</h2>
            <button onClick={onClose} className="hover:text-accent"><X size={20} /></button>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <Field label="Title" value={p.title} onChange={(v) => setP({ ...p, title: v })} />
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Description</label>
              <textarea value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} rows={3} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Price</label>
                <input type="number" step="0.01" value={p.price ?? ""} onChange={(e) => setP({ ...p, price: e.target.value === "" ? null : parseFloat(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Currency</label>
                <select value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })} className={inputCls}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.whatsapp_only} onChange={(e) => setP({ ...p, whatsapp_only: e.target.checked })} />
              Hide price — show "WhatsApp" instead
            </label>

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Photos ({imgs.length})</label>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddUrl(true)} className="text-[10px] uppercase tracking-widest bg-background border border-border rounded px-2 py-1 hover:bg-foreground hover:text-background">Add URL</button>
                  <label className="text-[10px] uppercase tracking-widest bg-foreground text-background rounded px-2 py-1 cursor-pointer flex items-center gap-1 hover:bg-accent">
                    <Upload size={10} /> Upload
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {imgs.map((im) => (
                  <div key={im.id} className="relative group border border-border rounded bg-surface-muted aspect-square overflow-hidden">
                    <img src={resolveImageUrl(im.url, settings?.image_base_url ?? "")} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-foreground/70 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                      <div className="flex gap-1">
                        <button onClick={() => moveImg(im.id, -1)} className="bg-background text-foreground p-1 rounded"><ChevronUp size={12} /></button>
                        <button onClick={() => moveImg(im.id, 1)} className="bg-background text-foreground p-1 rounded"><ChevronDown size={12} /></button>
                      </div>
                      <button onClick={() => removeImg(im.id)} className="bg-destructive text-destructive-foreground p-1 rounded"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Sizes — leave empty if N/A ({sizes.length})</label>
                <button onClick={() => setShowAddSize(true)} className="text-[10px] uppercase tracking-widest bg-foreground text-background rounded px-2 py-1 hover:bg-accent">+ Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 border border-border rounded px-2 py-1 text-xs">
                    {s.size}
                    <button onClick={() => removeSize(s.id)} className="text-destructive hover:opacity-70"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Colors — only those visible on photos ({colors.length})</label>
                <button onClick={() => setShowAddColor(true)} className="text-[10px] uppercase tracking-widest bg-foreground text-background rounded px-2 py-1 hover:bg-accent">+ Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 border border-border rounded px-2 py-1 text-xs">
                    {c.hex && <span className="w-3 h-3 rounded-full border border-border" style={{ background: c.hex }} />}
                    {c.name}
                    <button onClick={() => removeColor(c.id)} className="text-destructive hover:opacity-70"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-border bg-surface-muted rounded-b-xl">
            <button onClick={() => setConfirmDel(true)} className="text-destructive text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
              <Trash2 size={12} /> Delete product
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className={chipBtn}>Cancel</button>
              <button onClick={save} disabled={busy} className={`${primaryBtn} px-6`}>{busy ? "..." : "Save"}</button>
            </div>
          </div>
        </div>
      </div>

      {showAddUrl && (
        <PromptModal title="Add image by URL" label="URL or relative path" placeholder="https://… or brand/category/file.jpg"
          onSubmit={addUrlImage} onClose={() => setShowAddUrl(false)} />
      )}
      {showAddSize && (
        <PromptModal title="Add size" label="Size value" placeholder="e.g. M, 42, XL"
          onSubmit={addSize} onClose={() => setShowAddSize(false)} />
      )}
      {showAddColor && (
        <PromptModal title="Add color" label="Color name" placeholder="e.g. Black"
          onSubmit={(name) => { setColorStep({ name }); }} onClose={() => setShowAddColor(false)} />
      )}
      {colorStep && (
        <Modal title={`Hex for "${colorStep.name}"`} onClose={() => setColorStep(null)}>
          <p className="text-xs text-muted-foreground mb-3">Optional — used for the color swatch dot.</p>
          <HexPicker onPick={(hex) => { addColor(colorStep.name, hex); setColorStep(null); }} onSkip={() => { addColor(colorStep.name, null); setColorStep(null); }} />
        </Modal>
      )}
      {confirmDel && (
        <ConfirmModal title="Delete product" message={`Delete "${p.title}"? This cannot be undone.`} danger
          onConfirm={del} onClose={() => setConfirmDel(false)} />
      )}
    </>
  );
}
