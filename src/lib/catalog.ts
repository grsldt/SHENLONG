import { supabase } from "@/integrations/supabase/client";

export type Brand = { id: string; name: string; slug: string; sort_order: number };
export type Category = { id: string; brand_id: string; name: string; slug: string; sort_order: number };
export type ProductImage = { id: string; product_id: string; url: string; sort_order: number };
export type ProductColor = { id: string; name: string; hex: string | null };
export type Product = {
  id: string;
  brand_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_label: string | null;
  currency: string;
  whatsapp_only: boolean;
  sort_order: number;
  images?: ProductImage[];
  sizes?: { id: string; size: string }[];
  colors?: ProductColor[];
};

export type SiteSettings = {
  whatsapp_number: string;
  tracking_url: string;
  image_base_url: string;
};

// Shenlong Market — Japan agent. Keep this number separate from Dragon Market.
export const SHENLONG_WHATSAPP = "+819045618512";

export async function fetchSettings(): Promise<SiteSettings> {
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const base = (data as SiteSettings | null) ?? { whatsapp_number: SHENLONG_WHATSAPP, tracking_url: "https://neocartrige.com", image_base_url: "" };
  return { ...base, whatsapp_number: SHENLONG_WHATSAPP };
}

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase.from("brands").select("*").order("sort_order").order("name");
  if (error) throw error;
  return (data as Brand[]) ?? [];
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function fetchProducts(filters: { brandId?: string | null; categoryId?: string | null; search?: string }): Promise<Product[]> {
  let q = supabase
    .from("products")
    .select("*, images:product_images(id, product_id, url, sort_order), sizes:product_sizes(id, size), colors:product_colors(id, name, hex)")
    .order("sort_order")
    .limit(1000);
  if (filters.brandId) q = q.eq("brand_id", filters.brandId);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.search) q = q.ilike("title", `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) ?? []).map((p) => ({
    ...p,
    images: (p.images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  })) as Product[];
}

export function resolveImageUrl(url: string, base: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("storage://")) {
    const path = url.replace("storage://", "");
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }
  const b = (base || "/catalog/").replace(/\/+$/, "/");
  return b + url.split("/").map(encodeURIComponent).join("/");
}

export function thumbUrl(url: string, base: string, width = 480): string {
  const full = resolveImageUrl(url, base);
  if (!full) return "";
  const m = full.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/([^?]+)(\?.*)?$/);
  if (m) return `${m[1]}/storage/v1/render/image/public/${m[2]}?width=${width}&quality=75&resize=contain`;
  return full;
}

export function defaultSizesFor(categoryName?: string | null): string[] {
  const n = (categoryName || "").toLowerCase();
  const isShoe = /(shoe|sneaker|boot|chaussure|trainer|runner|footwear|sandal)/.test(n);
  if (isShoe) return ["39", "40", "41", "42", "43", "44", "45", "46"];
  const isClothing = /(cloth|apparel|shirt|t-?shirt|tee|hood|sweat|jacket|coat|pant|trouser|jean|short|dress|skirt|polo|tracksuit|jersey|vetement|vêtement|haut|bas|pull|chemise|veste|manteau|robe|jupe|legging|sport ?wear|underwear|sock|chaussette)/.test(n);
  if (isClothing) return ["XS", "S", "M", "L", "XL", "XXL"];
  return [];
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const num = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function formatPrice(price: number | null | undefined, currency: string = "USD"): string {
  if (price == null) return "";
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  if (currency === "EUR") return `${price}€`;
  return `${symbol}${price}`;
}
