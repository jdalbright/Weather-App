"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, MapPin } from "lucide-react";
import { geocodeLocation, GeocodeResult } from "@/lib/weather";

interface SearchBarProps {
    onLocationSelect: (lat: number, lon: number, name: string) => void;
    placeholder?: string;
}

const RECENT_SEARCHES_KEY = "weather_recent_searches";

export default function SearchBar({ onLocationSelect, placeholder = "Search city..." }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
    const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse recent searches", e);
            }
        }
    }, []);

    // Handle autocomplete
    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
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
        onLocationSelect(location.lat, location.lon, location.name);
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
                <div className="absolute left-4 text-gray-400 group-focus-within:text-gray-600 transition-colors">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`w-full backdrop-blur-md py-3 pl-12 pr-12 outline-none border-2 transition-all text-gray-800 font-semibold shadow-lg organic-input ${isOpen && (query.length >= 2 || recentSearches.length > 0)
                            ? "bg-white/90 border-white rounded-t-[24px] rounded-b-none border-b-white/50"
                            : "bg-white/70 border-transparent focus:border-white focus:bg-white/90 rounded-[24px]"
                        }`}
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Dropdown Suggestions */}
            {isOpen && (query.length >= 2 || recentSearches.length > 0) && (
                <div className="absolute top-full mt-0 w-full bg-white/90 backdrop-blur-md rounded-b-[24px] shadow-lg overflow-hidden z-50 border-2 border-white border-t-0 animate-in fade-in duration-200">

                    {/* Suggestions from API */}
                    {query.length >= 2 && suggestions.length > 0 && (
                        <div className="p-2">
                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suggestions</div>
                            {suggestions.map((s, i) => (
                                <button
                                    key={`suggestion-${i}`}
                                    onClick={() => handleSelect(s)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 rounded-xl transition-colors text-left text-gray-700 font-medium"
                                >
                                    <MapPin size={16} className="text-gray-300" />
                                    <span className="truncate">{s.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && query.length < 2 && (
                        <div className="p-2">
                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Searches</div>
                            {recentSearches.map((r, i) => (
                                <button
                                    key={`recent-${i}`}
                                    onClick={() => handleSelect(r)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 rounded-xl transition-colors text-left text-gray-700 font-medium"
                                >
                                    <Clock size={16} className="text-gray-300" />
                                    <span className="truncate">{r.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Loading / No Results */}
                    {isLoading && query.length >= 2 && suggestions.length === 0 && (
                        <div className="px-6 py-4 text-sm text-gray-400 italic">Finding places...</div>
                    )}

                    {!isLoading && query.length >= 2 && suggestions.length === 0 && (
                        <div className="px-6 py-4 text-sm text-gray-400 italic">No locations found</div>
                    )}
                </div>
            )}
        </div>
    );
}
