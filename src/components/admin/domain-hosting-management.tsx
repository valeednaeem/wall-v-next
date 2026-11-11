"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Cloud,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Tag,
  Calendar,
  DollarSign,
  Package,
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
  isActive: boolean;
}

interface HostingPlan {
  _id: string;
  name: string;
  provider: string;
  price: number;
  renewalPrice: number;
  currency: string;
  features: string[];
  description: string;
  isActive: boolean;
  margin: number;
  finalPrice: number;
}

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

interface HostingOffer {
  _id: string;
  planId: string;
  provider: string;
  name: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  currency: string;
  description: string;
  isActive: boolean;
  validUntil?: string;
  createdAt: string;
}

export function AdminDomainHosting() {
  const [activeTab, setActiveTab] = useState<"domains" | "hosting" | "domain-offers" | "hosting-offers">("domains");
  const [domainTLDs, setDomainTLDs] = useState<DomainTLD[]>([]);
  const [hostingPlans, setHostingPlans] = useState<HostingPlan[]>([]);
  const [domainOffers, setDomainOffers] = useState<DomainOffer[]>([]);
  const [hostingOffers, setHostingOffers] = useState<HostingOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "domains") {
        const response = await fetch("/api/admin/domains/tlds");
        const data = await response.json();
        if (data.success) setDomainTLDs(data.tlds);
      } else if (activeTab === "hosting") {
        const response = await fetch("/api/admin/hosting/plans");
        const data = await response.json();
        if (data.success) setHostingPlans(data.plans);
      } else if (activeTab === "domain-offers") {
        const response = await fetch("/api/admin/offers/domains");
        const data = await response.json();
        if (data.success) setDomainOffers(data.offers);
      } else if (activeTab === "hosting-offers") {
        const response = await fetch("/api/admin/offers/hosting");
        const data = await response.json();
        if (data.success) setHostingOffers(data.offers);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDomainActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/domains/tlds/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update domain:", error);
    }
  };

  const toggleHostingActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/hosting/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update hosting:", error);
    }
  };

  const deleteDomainOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await fetch(`/api/admin/offers/domains/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to delete offer:", error);
    }
  };

  const deleteHostingOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await fetch(`/api/admin/offers/hosting/${id}`, { method: "DELETE" });
      fetchData();
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

  const tabs = [
    { id: "domains" as const, label: "Domain TLDs", icon: Globe },
    { id: "hosting" as const, label: "Hosting Plans", icon: Cloud },
    { id: "domain-offers" as const, label: "Domain Offers", icon: Tag },
    { id: "hosting-offers" as const, label: "Hosting Offers", icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Domain & Hosting Management</h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === "domains" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Domain TLDs</h2>
                <span className="text-sm text-gray-500">
                  {domainTLDs.length} TLDs configured
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold">TLD</th>
                      <th className="text-left py-3 px-4 font-semibold">Provider</th>
                      <th className="text-left py-3 px-4 font-semibold">Base Price</th>
                      <th className="text-left py-3 px-4 font-semibold">Margin</th>
                      <th className="text-left py-3 px-4 font-semibold">Final Price</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainTLDs.map((tld) => (
                      <tr key={tld._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">.{tld.tld}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                            {tld.provider === "resellerspanel" ? "ResellersPanel" : "WebSouls"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {formatPrice(tld.registrationPrice, tld.currency)}/yr
                        </td>
                        <td className="py-3 px-4">{tld.margin}%</td>
                        <td className="py-3 px-4 font-medium">
                          {formatPrice(tld.finalPrice, tld.currency)}/yr
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              tld.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tld.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleDomainActive(tld._id, tld.isActive)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            {tld.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "hosting" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Hosting Plans</h2>
                <span className="text-sm text-gray-500">
                  {hostingPlans.length} plans configured
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold">Plan</th>
                      <th className="text-left py-3 px-4 font-semibold">Provider</th>
                      <th className="text-left py-3 px-4 font-semibold">Base Price</th>
                      <th className="text-left py-3 px-4 font-semibold">Margin</th>
                      <th className="text-left py-3 px-4 font-semibold">Final Price</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostingPlans.map((plan) => (
                      <tr key={plan._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-sm text-gray-500">{plan.description}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                            {plan.provider === "resellerspanel" ? "ResellersPanel" : "WebSouls"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {formatPrice(plan.price, plan.currency)}/yr
                        </td>
                        <td className="py-3 px-4">{plan.margin}%</td>
                        <td className="py-3 px-4 font-medium">
                          {formatPrice(plan.finalPrice, plan.currency)}/yr
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              plan.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {plan.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleHostingActive(plan._id, plan.isActive)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            {plan.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "domain-offers" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Domain Offers</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Offer
                </button>
              </div>
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
                    {domainOffers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          No domain offers created yet
                        </td>
                      </tr>
                    ) : (
                      domainOffers.map((offer) => (
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
                                onClick={() => deleteDomainOffer(offer._id)}
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
          )}

          {activeTab === "hosting-offers" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Hosting Offers</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Offer
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold">Plan</th>
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
                    {hostingOffers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          No hosting offers created yet
                        </td>
                      </tr>
                    ) : (
                      hostingOffers.map((offer) => (
                        <tr key={offer._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{offer.name}</td>
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
                                onClick={() => deleteHostingOffer(offer._id)}
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
          )}
        </>
      )}
    </div>
  );
}
