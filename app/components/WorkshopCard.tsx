"use client";

import Image from "next/image";
import Link from "next/link";
import type { Workshop } from "../../lib/api";
import { coverFor, dayTwoDigit, monthShort, seatsTaken, whenLabel } from "../../lib/format";
import { CapacityBar, Icon } from "./ui";

// Figma: WorkshopCard (cover with date stamp and decoration, body with meta, seats, and action).
export function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const cover = coverFor(workshop._id);
  const titleId = `wcard-${workshop._id}`;
  return (
    <article className="wcard" aria-labelledby={titleId}>
      <div className="wcard-cover" style={{ background: cover.bg }}>
        <div className="datestamp" aria-hidden>
          <span className="t-label datestamp-month">{monthShort(workshop.workshopDate)}</span>
          <span className="datestamp-day">{dayTwoDigit(workshop.workshopDate)}</span>
        </div>
        <Image className="wcard-deco" src={cover.deco} alt="" aria-hidden width={120} height={120} unoptimized loading="eager" />
      </div>
      <div className="wcard-body">
        <h2 id={titleId} className="t-heading-s">
          {workshop.name}
        </h2>
        <p className="meta">
          <Icon name="user" size={18} />
          <span>{workshop.instructor}</span>
        </p>
        <p className="meta">
          <Icon name="pin" size={18} />
          <span>{workshop.location}</span>
        </p>
        <p className="meta">
          <Icon name="clock" size={18} />
          <span>{whenLabel(workshop)}</span>
        </p>
        <div className="seats">
          <div className="seats-label">
            <span className="t-label muted">Seats</span>
            <span className="t-strong">
              {seatsTaken(workshop)} / {workshop.capacity} taken
            </span>
          </div>
          <CapacityBar workshop={workshop} />
        </div>
        <Link href={`/workshop/${workshop._id}`} className="btn btn-dark btn-block" aria-describedby={titleId}>
          View workshop
        </Link>
      </div>
    </article>
  );
}
