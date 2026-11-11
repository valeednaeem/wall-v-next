"use client";

import { useState, useEffect } from "react";
import { Globe, Search } from "lucide-react";

interface DomainTLD {
  _id: string;
  tld: string;
  finalPrice: number;
  finalRenewalPrice: number;
  currency: string;
  description: string;
  isPromo: boolean;
  promoPrice?: number;
  category: string;
}

export function DomainPricing() {
  const [tlds, setTlds] = useState<DomainTLD[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTLDs();
  }, []);

  const fetchTLDs = async () => {
    try {
      const response = await fetch("/api/domains/tlds");
      const data = await response.json();
      if (data.success) {
        setTlds(data.tlds);
      }
    } catch (error) {
      console.error("Failed to fetch TLDs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTLDs = tlds.filter((tld) => {
    const matchesSearch = tld.tld.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || tld.category === filter;
    return matchesSearch && matchesFilter;
  });

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading domain prices...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-center mb-2">Domain Pricing</h2>
      <p className="text-muted-foreground text-center mb-8">
        Choose from 70+ popular domain extensions
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-2xl mx-auto">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search TLDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {["all", "generic", "cctld", "new"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "All" : cat === "cctld" ? "Country" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* TLDs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {filteredTLDs.map((tld) => (
          <div
            key={tld._id}
            className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="font-bold text-lg">.{tld.tld}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {tld.description}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary">
                {formatPrice(tld.finalPrice)}
              </span>
              <span className="text-xs text-muted-foreground">/yr</span>
            </div>
            {tld.isPromo && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                Promo
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
