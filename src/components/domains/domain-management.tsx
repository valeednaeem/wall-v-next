"use client";

import { useState, useEffect } from "react";
import { Globe, RefreshCw, Trash2, Settings, ExternalLink } from "lucide-react";

interface Domain {
  _id: string;
  domain: string;
  status: string;
  provider: string;
  registrationDate: string;
  expiryDate: string;
  autoRenew: boolean;
  nameservers: string[];
}

export function DomainManagement() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/domains");
      const data = await response.json();
      if (data.success) {
        setDomains(data.domains);
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;

    try {
      const response = await fetch(`/api/domains/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDomains(domains.filter((d) => d._id !== id));
      }
    } catch (error) {
      console.error("Failed to delete domain:", error);
    }
  };

  const handleRenew = async (id: string) => {
    const years = prompt("Enter number of years to renew:");
    if (!years) return;

    try {
      const response = await fetch(`/api/domains/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ years: parseInt(years) }),
      });

      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error("Failed to renew domain:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500",
      pending: "bg-yellow-500",
      expired: "bg-red-500",
      suspended: "bg-red-500",
      transferring: "bg-blue-500",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold text-white rounded ${
          colors[status] || "bg-gray-500"
        }`}
      >
        {status}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            My Domains ({domains.length})
          </h2>
          <button
            onClick={fetchDomains}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
      <div className="p-6">
        {domains.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No domains found. Register your first domain!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Domain</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Provider</th>
                  <th className="text-left py-3 px-4 font-semibold">Registered</th>
                  <th className="text-left py-3 px-4 font-semibold">Expires</th>
                  <th className="text-left py-3 px-4 font-semibold">Days Left</th>
                  <th className="text-left py-3 px-4 font-semibold">Auto-Renew</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => {
                  const daysLeft = getDaysUntilExpiry(domain.expiryDate);
                  return (
                    <tr key={domain._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{domain.domain}</td>
                      <td className="py-3 px-4">{getStatusBadge(domain.status)}</td>
                      <td className="py-3 px-4">
                        {domain.provider === "resellerspanel"
                          ? "ResellersPanel"
                          : "WebSouls"}
                      </td>
                      <td className="py-3 px-4">{formatDate(domain.registrationDate)}</td>
                      <td className="py-3 px-4">{formatDate(domain.expiryDate)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            daysLeft < 30
                              ? "text-red-500 font-medium"
                              : "text-gray-500"
                          }
                        >
                          {daysLeft} days
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            domain.autoRenew
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {domain.autoRenew ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRenew(domain._id)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Renew"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              window.open(`https://${domain.domain}`, "_blank")
                            }
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Visit"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              alert(
                                `Nameservers:\n${domain.nameservers.join("\n")}`
                              )
                            }
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                            title="Nameservers"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(domain._id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
