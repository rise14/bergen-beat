// ─── Shared TypeScript types for Bergen Beat ──────────────────────────────────
// These mirror the Supabase database schema. Update if the schema changes.

export type UUID = string;

export interface Category {
  id: UUID;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

export interface Neighborhood {
  id: UUID;
  name: string;
  slug: string;
  city: string | null;
}

export interface Venue {
  id: UUID;
  name: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood_id: UUID | null;
  website: string | null;
}

export type EventStatus = "draft" | "published" | "archived";

export interface Event {
  id: UUID;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: EventStatus;
  is_free: boolean;
  price_range: string | null;
  external_url: string | null;
  category_id: UUID | null;
  venue_id: UUID | null;
  neighborhood_id: UUID | null;
  start_date: string;       // ISO 8601
  end_date: string | null;
  is_recurring: boolean;
  recurrence_note: string | null;
  banner_url: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
  featured: boolean;
  source: "admin" | "submission" | "ticketmaster" | "predicthq";
  external_id: string | null;    // external API event ID for deduplication
  submission_id: UUID | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (present when fetched with select())
  category?: Category | null;
  venue?: Venue | null;
  neighborhood?: Neighborhood | null;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface EventSubmission {
  id: UUID;
  title: string;
  description: string | null;
  is_free: boolean;
  price_range: string | null;
  external_url: string | null;
  category_id: UUID | null;
  venue_name: string;
  venue_address: string | null;
  start_date: string;
  end_date: string | null;
  organizer_name: string;
  organizer_email: string;
  banner_url: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: UUID | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: UUID;
  email: string;
  confirmed: boolean;
  subscribed_at: string;
}

// ─── Import log — tracks events pulled from external APIs ────────────────────

export type ImportSource = "ticketmaster" | "predicthq";

export interface ImportLog {
  id: UUID;
  source: ImportSource;
  external_id: string;
  event_id: UUID | null;
  status: "imported" | "skipped" | "error";
  raw_data: Record<string, unknown> | null;
  imported_at: string;
}

// ─── Normalised event shape returned by importers before DB insert ────────────

export interface ImportedEvent {
  title: string;
  short_description: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_free: boolean;
  price_range: string | null;
  external_url: string | null;
  banner_url: string | null;
  organizer_name: string | null;
  source: ImportSource;
  external_id: string;
  venue: {
    name: string;
    address: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  category_guess: string | null;  // category name hint for auto-matching
}

// ─── Filter params used on the /events browse page ───────────────────────────

export interface EventFilters {
  categorySlug?: string;
  neighborhoodSlug?: string;
  dateFilter?: "today" | "this-weekend" | "this-week" | "this-month";
  freeOnly?: boolean;
  query?: string;
  limit?: number;
  page?: number;      // 1-based
  pageSize?: number;  // defaults to PAGE_SIZE in lib/events.ts
}

export interface PaginatedEvents {
  events: Event[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
