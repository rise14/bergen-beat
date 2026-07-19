import {
  Music,
  Pizza,
  Palette,
  Trees,
  Dumbbell,
  HeartHandshake,
  Baby,
  Laugh,
  Film,
  Moon,
  ShoppingBag,
  Flower2,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

// Maps category slugs to a matched line-icon set — replaces raw emoji so
// badges/chips read as one designed system instead of OS-dependent glyphs.
const ICONS: Record<string, LucideIcon> = {
  music: Music,
  "food-drink": Pizza,
  "arts-culture": Palette,
  outdoors: Trees,
  "sports-fitness": Dumbbell,
  community: HeartHandshake,
  "kids-family": Baby,
  comedy: Laugh,
  "film-media": Film,
  nightlife: Moon,
  "markets-fairs": ShoppingBag,
  wellness: Flower2,
};

interface Props {
  slug?: string | null;
  className?: string;
}

export function CategoryIcon({ slug, className = "h-3.5 w-3.5" }: Props) {
  const Icon = (slug && ICONS[slug]) || CalendarDays;
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}
