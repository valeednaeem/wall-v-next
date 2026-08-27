"use client";

import { useState } from "react";
import { Globe, Search, Check, X } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  domain: string;
  available: boolean;
  price?: number;
  renewalPrice?: number;
  currency?: string;
  tld?: string;
  provider?: string;
}

export default function DomainsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/domains/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data?.results || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Domain Names</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Find the perfect domain name for your business. Search availability and register instantly.
          </p>
          <div className="flex max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Enter domain name (e.g. mybusiness)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 rounded-l-lg border border-r-0 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-r-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {loading && (
          <div className="text-center py-12 text-muted-foreground">Searching domains...</div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No results found. Try a different search term.
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.domain} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{r.domain}</span>
                      {r.available ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-sm text-green-600">
                          <Check className="h-3 w-3" /> Available
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center gap-1 text-sm text-red-600">
                          <X className="h-3 w-3" /> Taken
                        </span>
                      )}
                    </div>
                  </div>
                  {r.available && r.price !== undefined && (
                    <div className="text-right">
                      <div className="font-semibold">${r.price}/{r.tld}</div>
                      {r.renewalPrice && (
                        <div className="text-xs text-muted-foreground">Renews at ${r.renewalPrice}</div>
                      )}
                    </div>
                  )}
                  {r.available && (
                    <Link
                      href={`/contact?service=domain&domain=${r.domain}`}
                      className="ml-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:bg-primary/90"
                    >
                      Register
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!searched && (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Enter a domain name above to check availability.</p>
          </div>
        )}
      </section>
    </div>
  );
}
