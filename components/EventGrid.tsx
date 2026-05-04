import type { Event } from "@/types";
import { EventCard } from "./EventCard";

interface Props {
  events: Event[];
}

export function EventGrid({ events }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
