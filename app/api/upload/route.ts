/**
 * POST /api/upload
 * Accepts a multipart/form-data request with a single "file" field.
 * Validates type (JPEG/PNG/WebP) and size (≤ 5 MB), uploads to
 * Supabase Storage bucket "event-images", and returns the public URL.
 *
 * Used by the public event submission form.
 */

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = "event-images";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 422 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 5 MB or smaller" },
      { status: 422 }
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `submissions/${crypto.randomUUID()}.${ext}`;

  const supabase = createAdminSupabaseClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
