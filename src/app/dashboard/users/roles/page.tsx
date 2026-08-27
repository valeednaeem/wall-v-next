"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Shield, Plus, Edit2, Trash2, Check, X, Loader2, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions";

interface Role {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
}

const PERMISSION_GROUPS = [
  { label: "Users", permissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_DELETE] },
  { label: "Roles", permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_DELETE] },
  { label: "Products", permissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_DELETE] },
  { label: "Blog", permissions: [PERMISSIONS.BLOG_VIEW, PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_EDIT, PERMISSIONS.BLOG_DELETE, PERMISSIONS.BLOG_PUBLISH] },
  { label: "Orders", permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE] },
  { label: "Invoices", permissions: [PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_MANAGE] },
  { label: "Projects", permissions: [PERMISSIONS.PROJECTS_VIEW, PERMISSIONS.PROJECTS_CREATE, PERMISSIONS.PROJECTS_EDIT, PERMISSIONS.PROJECTS_DELETE] },
  { label: "CRM", permissions: [PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEADS, PERMISSIONS.CRM_CLIENTS, PERMISSIONS.CRM_INQUIRIES] },
  { label: "Hosting", permissions: [PERMISSIONS.HOSTING_VIEW, PERMISSIONS.HOSTING_MANAGE] },
  { label: "Domains", permissions: [PERMISSIONS.DOMAINS_VIEW, PERMISSIONS.DOMAINS_MANAGE] },
  { label: "Marketing", permissions: [PERMISSIONS.MARKETING_VIEW, PERMISSIONS.MARKETING_MANAGE] },
  { label: "SEO", permissions: [PERMISSIONS.SEO_VIEW, PERMISSIONS.SEO_MANAGE] },
  { label: "Tracking", permissions: [PERMISSIONS.TRACKING_VIEW, PERMISSIONS.TRACKING_MANAGE] },
  { label: "AI", permissions: [PERMISSIONS.AI_ACCESS, PERMISSIONS.AI_MANAGE] },
  { label: "Agents", permissions: [PERMISSIONS.AGENTS_VIEW, PERMISSIONS.AGENTS_CREATE, PERMISSIONS.AGENTS_EDIT, PERMISSIONS.AGENTS_DELETE, PERMISSIONS.AGENTS_EXECUTE, PERMISSIONS.AGENTS_APPROVE, PERMISSIONS.AGENTS_MONITOR, PERMISSIONS.AGENTS_CONFIGURE] },
  { label: "Settings", permissions: [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE] },
];

export default function RolesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super-admin";

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Role created successfully" });
        setShowCreate(false);
        setForm({ name: "", slug: "", description: "", permissions: [] });
        fetchRoles();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create role" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/roles/${editingRole._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Role updated successfully" });
        setEditingRole(null);
        fetchRoles();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update role" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Role deleted" });
        fetchRoles();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete role" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      slug: role.slug,
      description: role.description || "",
      permissions: [...role.permissions],
    });
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const toggleGroup = (groupPerms: string[]) => {
    setForm((prev) => {
      const allSelected = groupPerms.every((p) => prev.permissions.includes(p));
      if (allSelected) {
        return { ...prev, permissions: prev.permissions.filter((p) => !groupPerms.includes(p)) };
      }
      return { ...prev, permissions: [...new Set([...prev.permissions, ...groupPerms])] };
    });
  };

  const hasAllPermissions = (role: Role) => role.permissions.includes("*");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Roles & Permissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage roles and their access permissions</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setShowCreate(true); setEditingRole(null); setForm({ name: "", slug: "", description: "", permissions: [] }); }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Role
          </button>
        )}
      </div>

      {message && (
        <div className={cn("p-3 rounded-lg text-sm", message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200")}>
          {message.text}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreate || editingRole) && (
        <div className="rounded-lg border p-6 space-y-4 bg-muted/30">
          <h3 className="font-semibold">{editingRole ? "Edit Role" : "Create Role"}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Role name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="role-slug"
                disabled={!!editingRole?.isSystem}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Permissions</label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PERMISSION_GROUPS.map((group) => {
                const allSelected = group.permissions.every((p) => form.permissions.includes(p));
                const someSelected = group.permissions.some((p) => form.permissions.includes(p));
                return (
                  <div key={group.label} className={cn("rounded-lg border p-3", someSelected && "border-primary/30 bg-primary/5")}>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => toggleGroup(group.permissions)}
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        {allSelected ? <Lock className="h-3 w-3 text-primary" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
                        {group.label}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {group.permissions.filter((p) => form.permissions.includes(p)).length}/{group.permissions.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.permissions.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-muted-foreground">{perm.split(":").pop()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={editingRole ? handleUpdate : handleCreate}
              disabled={saving || !form.name || !form.slug}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingRole ? "Save Changes" : "Create Role"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setEditingRole(null); }}
              className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role._id} className={cn("rounded-lg border p-5 space-y-3", hasAllPermissions(role) && "border-red-200 bg-red-50/50")}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">System</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{role.description || "No description"}</p>
                </div>
                {isSuperAdmin && !role.isSystem && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(role)} className="p-1.5 rounded hover:bg-accent" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(role._id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {isSuperAdmin && role.isSystem && role.slug !== "super-admin" && (
                  <button onClick={() => openEdit(role)} className="p-1.5 rounded hover:bg-accent" title="Edit Permissions">
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {hasAllPermissions(role) ? (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Full Access</span>
                ) : (
                  role.permissions.slice(0, 8).map((p) => (
                    <span key={p} className="text-xs bg-muted px-2 py-1 rounded-full">{p.split(":").pop()}</span>
                  ))
                )}
                {role.permissions.length > 8 && !hasAllPermissions(role) && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">+{role.permissions.length - 8} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
