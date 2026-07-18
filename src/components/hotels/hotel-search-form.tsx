"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { isoDateFromToday } from "@/lib/format";
import type { HotelSearchQuery } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HotelSearchFormProps {
  loading: boolean;
  onSearch: (query: HotelSearchQuery) => void;
}

export function HotelSearchForm({ loading, onSearch }: HotelSearchFormProps) {
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [checkIn, setCheckIn] = useState(() => isoDateFromToday(30));
  const [checkOut, setCheckOut] = useState(() => isoDateFromToday(33));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const canSearch =
    city.trim().length >= 2 &&
    /^[A-Za-z]{2}$/.test(countryCode.trim()) &&
    checkIn.length === 10 &&
    checkOut.length === 10 &&
    checkOut > checkIn &&
    !loading;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSearch) return;
    onSearch({
      city: city.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label htmlFor="city" className="mb-1.5">
            City
          </Label>
          <Input
            id="city"
            placeholder="Rome"
            autoComplete="off"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="w-24">
          <Label htmlFor="country" className="mb-1.5">
            Country
          </Label>
          <Input
            id="country"
            placeholder="IT"
            maxLength={2}
            autoComplete="off"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
          />
        </div>

        <div>
          <Label htmlFor="checkin" className="mb-1.5">
            Check-in
          </Label>
          <Input
            id="checkin"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="checkout" className="mb-1.5">
            Check-out
          </Label>
          <Input
            id="checkout"
            type="date"
            min={checkIn}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>

        <div className="w-20">
          <Label htmlFor="hotel-adults" className="mb-1.5">
            Adults
          </Label>
          <Input
            id="hotel-adults"
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value) || 1)}
          />
        </div>

        <div className="w-20">
          <Label htmlFor="hotel-children" className="mb-1.5">
            Children
          </Label>
          <Input
            id="hotel-children"
            type="number"
            min={0}
            max={9}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value) || 0)}
          />
        </div>

        <div className="w-20">
          <Label htmlFor="rooms" className="mb-1.5">
            Rooms
          </Label>
          <Input
            id="rooms"
            type="number"
            min={1}
            max={5}
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value) || 1)}
          />
        </div>

        <Button type="submit" disabled={!canSearch} className="ml-auto">
          <Search className="size-4" aria-hidden />
          {loading ? "Searching…" : "Search hotels"}
        </Button>
      </div>
    </form>
  );
}
