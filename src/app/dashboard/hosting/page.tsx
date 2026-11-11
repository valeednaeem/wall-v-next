"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Star,
  Check,
  X,
} from "lucide-react";

interface HostingPlan {
  _id: string;
  name: string;
  slug: string;
  provider: string;
  price: number;
  renewalPrice: number;
  currency: string;
  billingCycle: string;
  margin: number;
  finalPrice: number;
  finalRenewalPrice: number;
  description: string;
  shortDescription: string;
  features: string[];
  diskSpace: string;
  bandwidth: string;
  websites: number;
  emailAccounts: string;
  databases: string;
  ssl: boolean;
  backup: boolean;
  migration: boolean;
  sshAccess: boolean;
  dedicatedIp: boolean;
  websiteBuilder: boolean;
  isActive: boolean;
  isPopular: boolean;
  category: string;
}

export default function HostingDashboardPage() {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HostingPlan | null>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    provider: "resellerspanel",
    price: 0,
    renewalPrice: 0,
    margin: 15,
    category: "shared",
    description: "",
    shortDescription: "",
    diskSpace: "",
    bandwidth: "Unlimited",
    websites: 1,
    emailAccounts: "Unlimited",
    databases: "1",
    billingCycle: "monthly",
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/hosting/plans/manage");
      const data = await response.json();
      if (data.success) setPlans(data.plans);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPlan = async () => {
    try {
      const response = await fetch("/api/admin/hosting/plans/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewPlan({
          name: "", provider: "resellerspanel", price: 0, renewalPrice: 0,
          margin: 15, category: "shared", description: "", shortDescription: "",
          diskSpace: "", bandwidth: "Unlimited", websites: 1, emailAccounts: "Unlimited",
          databases: "1", billingCycle: "monthly",
        });
        fetchPlans();
      }
    } catch (error) {
      console.error("Failed to create plan:", error);
    }
  };

  const updatePlan = async (id: string, updates: Partial<HostingPlan>) => {
    try {
      await fetch(`/api/admin/hosting/plans/manage/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchPlans();
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await fetch(`/api/admin/hosting/plans/manage/${id}`, { method: "DELETE" });
      fetchPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || plan.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hosting Plans Management</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
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
            Add Plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans..."
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
          <option value="shared">Shared</option>
          <option value="cloud">Cloud</option>
          <option value="vps">VPS</option>
          <option value="dedicated">Dedicated</option>
          <option value="reseller">Reseller</option>
          <option value="email">Email</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Plans</div>
          <div className="text-2xl font-bold">{plans.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">{plans.filter((p) => p.isActive).length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Popular</div>
          <div className="text-2xl font-bold text-yellow-600">{plans.filter((p) => p.isPopular).length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Providers</div>
          <div className="text-2xl font-bold">{new Set(plans.map((p) => p.provider)).size}</div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <div
            key={plan._id}
            className={`bg-white rounded-lg shadow p-6 relative ${
              plan.isPopular ? "ring-2 ring-blue-500" : ""
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" />
                Popular
              </span>
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{plan.provider}</p>
              </div>
              <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded capitalize">
                {plan.category}
              </span>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold">{formatPrice(plan.finalPrice)}</span>
              <span className="text-gray-500 text-sm">/{plan.billingCycle}</span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{plan.shortDescription || plan.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>{plan.diskSpace} Storage</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>{plan.bandwidth} Bandwidth</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>{plan.websites === -1 ? "Unlimited" : plan.websites} Website{plan.websites !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>{plan.databases} Database{plan.databases !== "1" ? "s" : ""}</span>
              </div>
              {plan.sshAccess && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>SSH Access</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updatePlan(plan._id, { isActive: !plan.isActive })}
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    plan.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {plan.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => updatePlan(plan._id, { isPopular: !plan.isPopular })}
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    plan.isPopular
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {plan.isPopular ? "Popular" : "Normal"}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingPlan(plan)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deletePlan(plan._id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <h2 className="text-xl font-semibold mb-4">Add Hosting Plan</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={newPlan.provider}
                    onChange={(e) => setNewPlan({ ...newPlan, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="resellerspanel">ResellersPanel</option>
                    <option value="websouls">WebSouls</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlan.renewalPrice}
                    onChange={(e) => setNewPlan({ ...newPlan, renewalPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margin (%)</label>
                  <input
                    type="number"
                    value={newPlan.margin}
                    onChange={(e) => setNewPlan({ ...newPlan, margin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newPlan.category}
                    onChange={(e) => setNewPlan({ ...newPlan, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="shared">Shared</option>
                    <option value="cloud">Cloud</option>
                    <option value="vps">VPS</option>
                    <option value="dedicated">Dedicated</option>
                    <option value="reseller">Reseller</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select
                    value={newPlan.billingCycle}
                    onChange={(e) => setNewPlan({ ...newPlan, billingCycle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="biennially">Biennially</option>
                    <option value="triennially">Triennially</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disk Space</label>
                  <input
                    type="text"
                    value={newPlan.diskSpace}
                    onChange={(e) => setNewPlan({ ...newPlan, diskSpace: e.target.value })}
                    placeholder="e.g., 50GB NVMe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Websites</label>
                  <input
                    type="number"
                    value={newPlan.websites}
                    onChange={(e) => setNewPlan({ ...newPlan, websites: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
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
                onClick={createPlan}
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
