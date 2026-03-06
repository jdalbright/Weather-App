"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Close suggestions when interacting outside
    useEffect(() => {
        const handleInteractionOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                inputRef.current?.blur();
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleInteractionOutside);
        document.addEventListener("touchstart", handleInteractionOutside, { passive: true });

        return () => {
            document.removeEventListener("mousedown", handleInteractionOutside);
            document.removeEventListener("touchstart", handleInteractionOutside);
        };
    }, []);

    const dismissKeyboard = () => {
        inputRef.current?.blur();
    };

    const closeSuggestions = () => {
        dismissKeyboard();
        setIsOpen(false);
    };

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
        dismissKeyboard();
    };

    const clearSearch = () => {
        setQuery("");
        setSuggestions([]);
        inputRef.current?.focus();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        closeSuggestions();
    };

    const totalVisibleResults = (query.length >= 2 ? suggestions.length : recentSearches.length);
    const showScrollHint = totalVisibleResults > 4;

    return (
        <div className="relative w-full" ref={containerRef}>
            <form className="relative flex items-center group" onSubmit={handleSubmit}>
                <div className="theme-subtle absolute left-4 transition-colors group-focus-within:text-[var(--text-primary)]">
                    <Search size={20} />
                </div>
                <input
                    ref={inputRef}
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
                    enterKeyHint="done"
                    className={`organic-input h-14 w-full rounded-[24px] border pl-12 pr-24 font-semibold outline-none transition-all ${isOpen && (query.length >= 2 || recentSearches.length > 0)
                        ? "rounded-b-none border-[color:var(--border-strong)] bg-[var(--surface-elevated)]"
                        : "focus:border-[color:var(--border-strong)] focus:bg-[var(--surface-elevated)]"
                        }`}
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                    {query ? (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="theme-subtle flex h-11 w-11 items-center justify-center rounded-full transition-all hover:bg-[var(--surface-chip)] hover:text-[var(--text-primary)]"
                            aria-label="Clear search"
                        >
                            <X size={18} />
                        </button>
                    ) : null}
                    <button
                        type="submit"
                        className="surface-chip theme-heading hidden min-h-11 items-center rounded-full px-3 text-xs font-bold sm:inline-flex"
                    >
                        Done
                    </button>
                </div>
            </form>

            {/* Dropdown Suggestions */}
            {isOpen && (query.length >= 2 || recentSearches.length > 0) && (
                <div
                    className="search-dropdown surface-card absolute top-full z-50 mt-0 max-h-[min(18rem,calc(100dvh-8rem))] w-full overflow-y-auto overscroll-contain rounded-b-[24px] border-t-0 animate-in fade-in duration-200 [-webkit-overflow-scrolling:touch]"
                    onTouchStart={dismissKeyboard}
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--border-soft)] bg-[color:var(--surface-card-strong)] px-4 py-2 backdrop-blur">
                        <span className="theme-section-label text-[10px] font-bold tracking-[0.18em]">
                            {query.length >= 2 ? "Suggestions" : "Recent Searches"}
                        </span>
                        <button
                            type="button"
                            onClick={closeSuggestions}
                            className="surface-chip theme-heading inline-flex min-h-9 items-center rounded-full px-3 text-[11px] font-bold sm:hidden"
                        >
                            Done
                        </button>
                    </div>

                    {/* Suggestions from API */}
                    {query.length >= 2 && suggestions.length > 0 && (
                        <div className="p-2">
                            {suggestions.map((s, i) => (
                                <button
                                    key={`suggestion-${i}`}
                                    onClick={() => handleSelect(s)}
                                    className="theme-heading w-full rounded-xl px-4 py-1 text-left font-medium transition-colors hover:bg-[var(--surface-tile)]"
                                >
                                    <span className="flex min-h-[52px] items-center gap-3">
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
                            {recentSearches.map((r, i) => (
                                <button
                                    key={`recent-${i}`}
                                    onClick={() => handleSelect(r)}
                                    className="theme-heading w-full rounded-xl px-4 py-1 text-left font-medium transition-colors hover:bg-[var(--surface-tile)]"
                                >
                                    <span className="flex min-h-[52px] items-center gap-3">
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

                    {showScrollHint && (
                        <div className="sticky bottom-0 flex justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0),var(--surface-card-strong)_55%)] px-4 pb-3 pt-6">
                            <span className="surface-chip-muted rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                                Scroll for more
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
