/**
 * Stripe client singleton.
 * Import this in API routes / server actions — never in client components.
 */
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Price in cents for a one-week sponsored listing */
export const SPONSOR_PRICE_CENTS = 2500; // $25.00
export const SPONSOR_DURATION_DAYS = 7;
