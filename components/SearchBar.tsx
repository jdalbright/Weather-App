"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, MapPin } from "lucide-react";
import { geocodeLocation, GeocodeResult } from "@/lib/weather";

interface SearchBarProps {
    onLocationSelect: (lat: number, lon: number, name: string, countryCode?: string | null) => void;
    placeholder?: string;
}

const RECENT_SEARCHES_KEY = "weather_recent_searches";

export default function SearchBar({ onLocationSelect, placeholder = "Search city..." }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
    const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    console.error("Failed to parse recent searches", e);
                }
            }
        }
        return [];
    });
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle autocomplete
    useEffect(() => {
        if (query.trim().length < 2) {
            return;
        }

        const handler = setTimeout(async () => {
            setIsLoading(true);
            const results = await geocodeLocation(query, 5);
            setSuggestions(results || []);
            setIsLoading(false);
        }, 400);

        return () => clearTimeout(handler);
    }, [query]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addToRecentSearches = (location: GeocodeResult) => {
        const updated = [
            location,
            ...recentSearches.filter(r => r.name !== location.name)
        ].slice(0, 5);

        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const handleSelect = (location: GeocodeResult) => {
        onLocationSelect(location.lat, location.lon, location.name, location.countryCode);
        addToRecentSearches(location);
        setQuery("");
        setSuggestions([]);
        setIsOpen(false);
    };

    const clearSearch = () => {
        setQuery("");
        setSuggestions([]);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative flex items-center group">
                <div className="theme-subtle absolute left-4 transition-colors group-focus-within:text-[var(--text-primary)]">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        const newQuery = e.target.value;
                        setQuery(newQuery);
                        setIsOpen(true);
                        if (newQuery.trim().length < 2) {
                            setSuggestions([]);
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`organic-input h-14 w-full rounded-[24px] border pl-12 pr-12 font-semibold outline-none transition-all ${isOpen && (query.length >= 2 || recentSearches.length > 0)
                        ? "rounded-b-none border-[color:var(--border-strong)] bg-[var(--surface-elevated)]"
                        : "focus:border-[color:var(--border-strong)] focus:bg-[var(--surface-elevated)]"
                        }`}
                />
                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="theme-subtle absolute right-1.5 flex h-11 w-11 items-center justify-center rounded-full transition-all hover:bg-[var(--surface-chip)] hover:text-[var(--text-primary)]"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Dropdown Suggestions */}
            {isOpen && (query.length >= 2 || recentSearches.length > 0) && (
                <div className="surface-card absolute top-full z-50 mt-0 max-h-[min(20rem,calc(100dvh-7rem))] w-full overflow-y-auto overscroll-contain rounded-b-[24px] border-t-0 animate-in fade-in duration-200 [-webkit-overflow-scrolling:touch]">

                    {/* Suggestions from API */}
                    {query.length >= 2 && suggestions.length > 0 && (
                        <div className="p-2">
                            <div className="theme-section-label flex h-8 items-center px-4 text-[10px] font-bold tracking-widest">Suggestions</div>
                            {suggestions.map((s, i) => (
                                <button
                                    key={`suggestion-${i}`}
                                    onClick={() => handleSelect(s)}
                                    className="theme-heading w-full rounded-xl px-4 text-left font-medium transition-colors hover:bg-[var(--surface-tile)]"
                                >
                                    <span className="flex h-12 items-center gap-3">
                                        <MapPin size={16} className="theme-subtle" />
                                    <span className="truncate">{s.name}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && query.length < 2 && (
                        <div className="p-2">
                            <div className="theme-section-label flex h-8 items-center px-4 text-[10px] font-bold tracking-widest">Recent Searches</div>
                            {recentSearches.map((r, i) => (
                                <button
                                    key={`recent-${i}`}
                                    onClick={() => handleSelect(r)}
                                    className="theme-heading w-full rounded-xl px-4 text-left font-medium transition-colors hover:bg-[var(--surface-tile)]"
                                >
                                    <span className="flex h-12 items-center gap-3">
                                        <Clock size={16} className="theme-subtle" />
                                        <span className="truncate">{r.name}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Loading / No Results */}
                    {isLoading && query.length >= 2 && suggestions.length === 0 && (
                        <div className="theme-subtle px-6 py-4 text-sm italic">Finding places...</div>
                    )}

                    {!isLoading && query.length >= 2 && suggestions.length === 0 && (
                        <div className="theme-subtle px-6 py-4 text-sm italic">No locations found</div>
                    )}
                </div>
            )}
        </div>
    );
}
