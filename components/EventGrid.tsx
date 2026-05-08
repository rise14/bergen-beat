import type { Event } from "@/types";
import { EventCard } from "./EventCard";

interface Props {
  events: Event[];
  /**
   * How many cards at the start of the list are above the fold and should
   * be loaded eagerly (priority). Defaults to 0 (all lazy).
   * Pass 4 for the first grid on a page, 0 for secondary grids.
   */
  priorityCount?: number;
}

export function EventGrid({ events, priorityCount = 0 }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event, i) => (
        <EventCard key={event.id} event={event} priority={i < priorityCount} />
      ))}
    </div>
  );
}
