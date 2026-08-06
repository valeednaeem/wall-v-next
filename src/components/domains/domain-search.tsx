"use client";

import { useState } from "react";
import { Search, Globe, Check, Loader2 } from "lucide-react";

interface DomainResult {
  domain: string;
  tld: string;
  available: boolean;
  provider: string;
  registrationPrice: number;
  renewalPrice: number;
  currency: string;
  isPKDomain: boolean;
}

interface DomainSearchResult {
  domain: string;
  results: DomainResult[];
  cheapest: DomainResult | null;
}

const POPULAR_TLDS = [
  "com",
  "net",
  "org",
  "pk",
  "com.pk",
  "xyz",
  "online",
  "site",
  "tech",
  "store",
];

export function DomainSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<DomainSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState<DomainResult[]>([]);

  const handleSearch = async () => {
    if (!searchTerm) return;

    setIsSearching(true);
    try {
      const response = await fetch("/api/domains/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: searchTerm,
          tlds: POPULAR_TLDS,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.results[0]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const addToCart = (domain: DomainResult) => {
    if (!selectedDomains.find((d) => d.domain === domain.domain)) {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const removeFromCart = (domain: string) => {
    setSelectedDomains(selectedDomains.filter((d) => d.domain !== domain));
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "PKR" ? "PKR" : "USD",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" />
          Domain Search
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter your domain name (e.g., example)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Search Results for {results.domain}
          </h3>
          <div className="space-y-3">
            {results.results.map((result) => (
              <div
                key={result.domain}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{result.domain}</span>
                  {result.available ? (
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded">
                      Available
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded">
                      Taken
                    </span>
                  )}
                  {result.isPKDomain && (
                    <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded">
                      PK Domain
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    via{" "}
                    {result.provider === "resellerspanel"
                      ? "ResellersPanel"
                      : "WebSouls"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatPrice(result.registrationPrice, result.currency)}/yr
                    </div>
                    <div className="text-sm text-gray-500">
                      Renewal:{" "}
                      {formatPrice(result.renewalPrice, result.currency)}/yr
                    </div>
                  </div>
                  {result.available && (
                    <button
                      onClick={() => addToCart(result)}
                      disabled={selectedDomains.some(
                        (d) => d.domain === result.domain
                      )}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400"
                    >
                      {selectedDomains.some(
                        (d) => d.domain === result.domain
                      ) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        "Add"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDomains.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Selected Domains ({selectedDomains.length})
          </h3>
          <div className="space-y-2">
            {selectedDomains.map((domain) => (
              <div
                key={domain.domain}
                className="flex items-center justify-between p-2 border rounded"
              >
                <span>{domain.domain}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatPrice(domain.registrationPrice, domain.currency)}/yr
                  </span>
                  <button
                    onClick={() => removeFromCart(domain.domain)}
                    className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>
                {formatPrice(
                  selectedDomains.reduce(
                    (total, d) => total + d.registrationPrice,
                    0
                  ),
                  selectedDomains[0]?.currency || "USD"
                )}/yr
              </span>
            </div>
            <button className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
