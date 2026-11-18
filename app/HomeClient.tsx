"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Workshop } from "../lib/api";
import { bkkDay, errorText, isFull, isPast, seatsLeft } from "../lib/format";
import { useToday } from "../lib/hooks";
import { WorkshopCard } from "./components/WorkshopCard";
import { Button, Icon, Pagination, StatePanel, paginate } from "./components/ui";

type Filter = "all" | "week" | "open";
type Sort = "soonest" | "latest" | "name" | "seats";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "week", label: "This week" },
  { key: "open", label: "Has open seats" },
];
const SORTS: { key: Sort; label: string }[] = [
  { key: "soonest", label: "Soonest first" },
  { key: "latest", label: "Latest first" },
  { key: "name", label: "Name A–Z" },
  { key: "seats", label: "Most seats left" },
];
const PAGE_SIZE = 6;

// "YYYY-MM-DD" n days after a "YYYY-MM-DD" day.
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function HomeClient() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const today = useToday();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("soonest");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .listWorkshops(search || undefined)
      .then(
        (res) => {
          if (cancelled) return;
          setWorkshops(res.data);
          setError(null);
        },
        (e) => {
          if (!cancelled) setError(errorText(e));
        },
      )
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [search, reload]);

  const shown = useMemo(() => {
    let list = workshops;
    if (today && filter === "week") {
      const end = addDays(today, 6);
      list = list.filter((w) => {
        const day = bkkDay(w.workshopDate);
        return day >= today && day <= end;
      });
    }
    if (today && filter === "open") list = list.filter((w) => !isPast(w, today) && !isFull(w));
    const byDate = (a: Workshop, b: Workshop) => Date.parse(a.workshopDate) - Date.parse(b.workshopDate) || (a.startTime ?? "").localeCompare(b.startTime ?? "");
    const sorted = [...list];
    if (sort === "soonest") {
      // Upcoming workshops first (nearest first), then ended ones (most recent first).
      sorted.sort((a, b) => {
        const pa = today ? isPast(a, today) : false;
        const pb = today ? isPast(b, today) : false;
        if (pa !== pb) return pa ? 1 : -1;
        return pa ? byDate(b, a) : byDate(a, b);
      });
    } else if (sort === "latest") sorted.sort((a, b) => byDate(b, a));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => seatsLeft(b) - seatsLeft(a) || byDate(a, b));
    return sorted;
  }, [workshops, filter, sort, today]);

  const { total, current, items } = paginate(shown, page, PAGE_SIZE);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(input.trim());
    setPage(1);
  };

  return (
    <div className="page" style={{ gap: 0, paddingTop: 0 }}>
      <h1 className="sr-only">Browse workshops</h1>

      {/* Figma "box": search bar, 34px above and below */}
      <form role="search" className="searchbar" style={{ margin: "34px 0" }} onSubmit={submit}>
        <Icon name="search" size={22} />
        <label htmlFor="home-search" className="sr-only">
          Search workshops
        </label>
        <input
          id="home-search"
          type="search"
          value={input}
          placeholder="Search workshops..."
          onChange={(e) => {
            setInput(e.target.value);
            // Clearing the box with its × shows all workshops again.
            if (e.target.value === "" && search !== "") {
              setSearch("");
              setPage(1);
            }
          }}
        />
        <Button type="submit">Search</Button>
      </form>

      {/* Figma "Filters": chips left, sort right */}
      <div className="row" style={{ padding: "13px 0 45px", gap: 10 }}>
        <div className="chips" role="group" aria-label="Filter workshops">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip"
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <label className="select-pill">
          <span aria-hidden>
            Sort: {SORTS.find((s) => s.key === sort)?.label}
            <span className="caret">▾</span>
          </span>
          <select
            aria-label="Sort workshops"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(1);
            }}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="sr-only" role="status">
        {loaded && !error ? `${shown.length} workshop${shown.length === 1 ? "" : "s"} found` : ""}
      </p>

      {error ? (
        <StatePanel title="We could not load workshops">
          <p className="muted">{error}</p>
          <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>
            Try again
          </Button>
        </StatePanel>
      ) : !loaded ? (
        <StatePanel title="Loading workshops…" dashed />
      ) : shown.length === 0 ? (
        <StatePanel title={search ? `No workshops match “${search}”` : "No workshops here yet"} dashed>
          <p className="muted">
            {filter !== "all" ? "Try another filter, or clear the search." : search ? "Try a different word, or clear the search." : "New workshops show up here when an admin adds them."}
          </p>
        </StatePanel>
      ) : (
        <>
          <div className="card-grid" style={{ paddingTop: 8, paddingBottom: "var(--space-xl)" }}>
            {items.map((w) => (
              <WorkshopCard key={w._id} workshop={w} />
            ))}
          </div>
          <div style={{ paddingBottom: "var(--space-xxl)" }}>
            <Pagination
              label="Workshop pages"
              page={current}
              total={total}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
