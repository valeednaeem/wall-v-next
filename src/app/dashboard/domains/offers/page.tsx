"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface DomainOffer {
  _id: string;
  tld: string;
  provider: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  currency: string;
  description: string;
  isActive: boolean;
  validUntil?: string;
  createdAt: string;
}

export default function DomainOffersPage() {
  const [offers, setOffers] = useState<DomainOffer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    tld: "",
    provider: "resellerspanel",
    offerPrice: 0,
    validUntil: "",
    description: "",
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch("/api/admin/offers/domains");
      const data = await response.json();
      if (data.success) setOffers(data.offers);
    } catch (error) {
      console.error("Failed to fetch offers:", error);
    }
  };

  const createOffer = async () => {
    try {
      const response = await fetch("/api/admin/offers/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffer),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewOffer({ tld: "", provider: "resellerspanel", offerPrice: 0, validUntil: "", description: "" });
        fetchOffers();
      }
    } catch (error) {
      console.error("Failed to create offer:", error);
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await fetch(`/api/admin/offers/domains/${id}`, { method: "DELETE" });
      fetchOffers();
    } catch (error) {
      console.error("Failed to delete offer:", error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "PKR" ? "PKR" : "USD",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Domain Offers</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchOffers}
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
            Create Offer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold">TLD</th>
                <th className="text-left py-3 px-4 font-semibold">Provider</th>
                <th className="text-left py-3 px-4 font-semibold">Original</th>
                <th className="text-left py-3 px-4 font-semibold">Offer</th>
                <th className="text-left py-3 px-4 font-semibold">Discount</th>
                <th className="text-left py-3 px-4 font-semibold">Valid Until</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No domain offers created yet
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">.{offer.tld}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                        {offer.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4 line-through text-gray-500">
                      {formatPrice(offer.originalPrice, offer.currency)}
                    </td>
                    <td className="py-3 px-4 font-medium text-green-600">
                      {formatPrice(offer.offerPrice, offer.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                        -{offer.discount}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {offer.validUntil
                        ? new Date(offer.validUntil).toLocaleDateString()
                        : "No expiry"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          offer.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {offer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteOffer(offer._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Domain Offer</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TLD</label>
                <input
                  type="text"
                  value={newOffer.tld}
                  onChange={(e) => setNewOffer({ ...newOffer, tld: e.target.value })}
                  placeholder="e.g., com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={newOffer.provider}
                  onChange={(e) => setNewOffer({ ...newOffer, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="resellerspanel">ResellersPanel</option>
                  <option value="websouls">WebSouls</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price</label>
                <input
                  type="number"
                  value={newOffer.offerPrice}
                  onChange={(e) => setNewOffer({ ...newOffer, offerPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={newOffer.validUntil}
                  onChange={(e) => setNewOffer({ ...newOffer, validUntil: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
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
                onClick={createOffer}
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
