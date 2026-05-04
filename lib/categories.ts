import { createAdminSupabaseClient } from "./supabase/server";
import type { Category } from "@/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data as Category[]) ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();
  return (data as Category) ?? null;
}
