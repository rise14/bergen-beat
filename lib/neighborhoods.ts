import { createAdminSupabaseClient } from "./supabase/server";
import type { Neighborhood } from "@/types";

export async function getNeighborhoods(): Promise<Neighborhood[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("neighborhoods")
    .select("*")
    .order("name", { ascending: true });
  return (data as unknown as Neighborhood[]) ?? [];
}

export async function getNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();
  return (data as unknown as Neighborhood) ?? null;
}
