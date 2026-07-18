"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";

import { searchLocations } from "@/lib/tauri";
import { isoDateFromToday } from "@/lib/format";
import type {
  FlightSearchQuery,
  LocationSuggestion,
  TravelClass,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FlightSearchFormProps {
  loading: boolean;
  onSearch: (query: FlightSearchQuery) => void;
}

const TRAVEL_CLASSES: { value: TravelClass; label: string }[] = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
];

/** Debounced airport/city suggestions rendered into a native datalist. */
function useLocationSuggestions(keyword: string): LocationSuggestion[] {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = keyword.trim();
    timer.current = setTimeout(() => {
      // A bare IATA code means the user already picked — nothing to suggest.
      if (trimmed.length < 2 || /^[A-Z]{3}$/.test(trimmed)) {
        setSuggestions([]);
        return;
      }
      searchLocations(trimmed)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [keyword]);

  return suggestions;
}

function LocationDatalist({
  id,
  suggestions,
}: {
  id: string;
  suggestions: LocationSuggestion[];
}) {
  return (
    <datalist id={id}>
      {suggestions.map((s) => (
        <option key={`${s.iataCode}-${s.kind}`} value={s.iataCode}>
          {s.city ? `${s.city} — ${s.name}` : s.name}
        </option>
      ))}
    </datalist>
  );
}

export function FlightSearchForm({ loading, onSearch }: FlightSearchFormProps) {
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState(() => isoDateFromToday(30));
  const [returnDate, setReturnDate] = useState(() => isoDateFromToday(37));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [travelClass, setTravelClass] = useState<TravelClass>("ECONOMY");
  const [nonStop, setNonStop] = useState(false);

  const originSuggestions = useLocationSuggestions(origin);
  const destinationSuggestions = useLocationSuggestions(destination);

  const canSearch =
    /^[A-Za-z]{3}$/.test(origin.trim()) &&
    /^[A-Za-z]{3}$/.test(destination.trim()) &&
    departureDate.length === 10 &&
    !loading;

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSearch) return;
    onSearch({
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      departureDate,
      returnDate: tripType === "roundtrip" ? returnDate : undefined,
      adults,
      children,
      travelClass,
      nonStop,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5">
      <Tabs
        value={tripType}
        onValueChange={(v) => setTripType(v as typeof tripType)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="roundtrip">Round trip</TabsTrigger>
          <TabsTrigger value="oneway">One way</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <Label htmlFor="origin" className="mb-1.5">
            From
          </Label>
          <Input
            id="origin"
            list="origin-locations"
            placeholder="JFK"
            autoComplete="off"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <LocationDatalist id="origin-locations" suggestions={originSuggestions} />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mb-0.5"
          onClick={swap}
          aria-label="Swap origin and destination"
        >
          <ArrowLeftRight className="size-4" />
        </Button>

        <div className="w-36">
          <Label htmlFor="destination" className="mb-1.5">
            To
          </Label>
          <Input
            id="destination"
            list="destination-locations"
            placeholder="LHR"
            autoComplete="off"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <LocationDatalist
            id="destination-locations"
            suggestions={destinationSuggestions}
          />
        </div>

        <div>
          <Label htmlFor="departure" className="mb-1.5">
            Depart
          </Label>
          <Input
            id="departure"
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
        </div>

        {tripType === "roundtrip" && (
          <div>
            <Label htmlFor="return" className="mb-1.5">
              Return
            </Label>
            <Input
              id="return"
              type="date"
              min={departureDate}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
        )}

        <div className="w-20">
          <Label htmlFor="adults" className="mb-1.5">
            Adults
          </Label>
          <Input
            id="adults"
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value) || 1)}
          />
        </div>

        <div className="w-20">
          <Label htmlFor="children" className="mb-1.5">
            Children
          </Label>
          <Input
            id="children"
            type="number"
            min={0}
            max={9}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value) || 0)}
          />
        </div>

        <div className="w-44">
          <Label className="mb-1.5">Cabin</Label>
          <Select
            value={travelClass}
            onValueChange={(v) => setTravelClass(v as TravelClass)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAVEL_CLASSES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="mb-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nonStop}
            onChange={(e) => setNonStop(e.target.checked)}
            className="size-4 accent-primary"
          />
          Nonstop only
        </label>

        <Button type="submit" disabled={!canSearch} className="ml-auto">
          <Search className="size-4" aria-hidden />
          {loading ? "Searching…" : "Search flights"}
        </Button>
      </div>
    </form>
  );
}
