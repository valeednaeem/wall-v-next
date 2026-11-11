"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Tag,
  Percent,
} from "lucide-react";

interface DomainTLD {
  _id: string;
  tld: string;
  provider: string;
  registrationPrice: number;
  renewalPrice: number;
  currency: string;
  margin: number;
  finalPrice: number;
  finalRenewalPrice: number;
  description: string;
  isActive: boolean;
  isPromo: boolean;
  promoPrice?: number;
  category: string;
}

export default function DomainsDashboardPage() {
  const [tlds, setTlds] = useState<DomainTLD[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTLD, setEditingTLD] = useState<DomainTLD | null>(null);
  const [newTLD, setNewTLD] = useState({
    tld: "",
    provider: "resellerspanel",
    registrationPrice: 0,
    renewalPrice: 0,
    margin: 15,
    category: "generic",
    description: "",
    isPromo: false,
  });

  useEffect(() => {
    fetchTLDs();
  }, []);

  const fetchTLDs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/domains/tlds/manage");
      const data = await response.json();
      if (data.success) setTlds(data.tlds);
    } catch (error) {
      console.error("Failed to fetch TLDs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTLD = async () => {
    try {
      const response = await fetch("/api/admin/domains/tlds/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTLD),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewTLD({ tld: "", provider: "resellerspanel", registrationPrice: 0, renewalPrice: 0, margin: 15, category: "generic", description: "", isPromo: false });
        fetchTLDs();
      }
    } catch (error) {
      console.error("Failed to create TLD:", error);
    }
  };

  const updateTLD = async (id: string, updates: Partial<DomainTLD>) => {
    try {
      await fetch(`/api/admin/domains/tlds/manage/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchTLDs();
    } catch (error) {
      console.error("Failed to update TLD:", error);
    }
  };

  const deleteTLD = async (id: string) => {
    if (!confirm("Are you sure you want to delete this TLD?")) return;
    try {
      await fetch(`/api/admin/domains/tlds/manage/${id}`, { method: "DELETE" });
      fetchTLDs();
    } catch (error) {
      console.error("Failed to delete TLD:", error);
    }
  };

  const filteredTLDs = tlds.filter((tld) => {
    const matchesSearch = tld.tld.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || tld.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "PKR" ? "PKR" : "USD",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Domain TLDs Management</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchTLDs}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add TLD
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search TLDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="generic">Generic</option>
          <option value="cctld">Country Code</option>
          <option value="new">New TLDs</option>
          <option value="special">Special</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total TLDs</div>
          <div className="text-2xl font-bold">{tlds.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">{tlds.filter((t) => t.isActive).length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Promos</div>
          <div className="text-2xl font-bold text-orange-600">{tlds.filter((t) => t.isPromo).length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Categories</div>
          <div className="text-2xl font-bold">{new Set(tlds.map((t) => t.category)).size}</div>
        </div>
      </div>

      {/* TLDs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold">TLD</th>
              <th className="text-left py-3 px-4 font-semibold">Category</th>
              <th className="text-left py-3 px-4 font-semibold">Provider</th>
              <th className="text-left py-3 px-4 font-semibold">Registration</th>
              <th className="text-left py-3 px-4 font-semibold">Renewal</th>
              <th className="text-left py-3 px-4 font-semibold">Margin</th>
              <th className="text-left py-3 px-4 font-semibold">Final Price</th>
              <th className="text-left py-3 px-4 font-semibold">Status</th>
              <th className="text-left py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTLDs.map((tld) => (
              <tr key={tld._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">.{tld.tld}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded capitalize">
                    {tld.category}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                    {tld.provider}
                  </span>
                </td>
                <td className="py-3 px-4">{formatPrice(tld.registrationPrice, tld.currency)}</td>
                <td className="py-3 px-4">{formatPrice(tld.renewalPrice, tld.currency)}</td>
                <td className="py-3 px-4">{tld.margin}%</td>
                <td className="py-3 px-4 font-medium text-green-600">{formatPrice(tld.finalPrice, tld.currency)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {tld.isPromo && (
                      <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Promo
                      </span>
                    )}
                    <button
                      onClick={() => updateTLD(tld._id, { isActive: !tld.isActive })}
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        tld.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {tld.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTLD(tld)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTLD(tld._id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Domain TLD</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TLD</label>
                <input
                  type="text"
                  value={newTLD.tld}
                  onChange={(e) => setNewTLD({ ...newTLD, tld: e.target.value })}
                  placeholder="e.g., com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={newTLD.provider}
                    onChange={(e) => setNewTLD({ ...newTLD, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="resellerspanel">ResellersPanel</option>
                    <option value="websouls">WebSouls</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTLD.category}
                    onChange={(e) => setNewTLD({ ...newTLD, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="generic">Generic</option>
                    <option value="cctld">Country Code</option>
                    <option value="new">New TLD</option>
                    <option value="special">Special</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTLD.registrationPrice}
                    onChange={(e) => setNewTLD({ ...newTLD, registrationPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTLD.renewalPrice}
                    onChange={(e) => setNewTLD({ ...newTLD, renewalPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margin (%)</label>
                <input
                  type="number"
                  value={newTLD.margin}
                  onChange={(e) => setNewTLD({ ...newTLD, margin: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTLD.description}
                  onChange={(e) => setNewTLD({ ...newTLD, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPromo"
                  checked={newTLD.isPromo}
                  onChange={(e) => setNewTLD({ ...newTLD, isPromo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isPromo" className="text-sm font-medium text-gray-700">
                  Promotional Price
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createTLD}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
