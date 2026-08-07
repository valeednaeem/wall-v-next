"use client";

import { useState } from "react";
import { Search, Globe, ExternalLink, Loader2 } from "lucide-react";

const PROVIDERS = [
  {
    name: "ResellersPanel",
    description: "Generic TLDs (.com, .net, .org, etc.)",
    domainSearchUrl: "https://cp.resellerspanel.com/store/domain-search-form/",
    hostingUrl: "https://cp.resellerspanel.com/store/offers/",
    color: "blue",
  },
  {
    name: "WebSouls",
    description: "PK Domains (.pk, .com.pk, .edu.pk)",
    domainSearchUrl: "https://billing.websouls.com/cart.php?a=add&domain=register",
    hostingUrl: "https://billing.websouls.com/index.php?rp=/store/business-hosting",
    color: "green",
  },
];

export function DomainSearch() {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (provider: typeof PROVIDERS[0]) => {
    if (!domain) return;
    setIsLoading(true);
    const url = `${provider.domainSearchUrl}?domain=${encodeURIComponent(domain)}`;
    window.open(url, "_blank");
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5" />
        Domain Search
      </h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter your domain name (e.g., example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(PROVIDERS[0])}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.name}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div>
              <div className="font-medium">{provider.name}</div>
              <div className="text-sm text-gray-500">{provider.description}</div>
            </div>
            <button
              onClick={() => handleSearch(provider)}
              disabled={!domain || isLoading}
              className={`px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 disabled:opacity-50 transition-colors ${
                provider.color === "blue"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Domain availability and pricing will be shown on the provider's website
      </p>
    </div>
  );
}
