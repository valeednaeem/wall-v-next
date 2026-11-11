"use client";

import { useState, useEffect } from "react";
import { User, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: { street: string; city: string; state: string; country: string; zip: string };
  type: string;
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", phone: "", company: "", address: { street: "", city: "", state: "", country: "", zip: "" }, type: "individual" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/client/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      if (res.ok) setMessage("Profile updated successfully.");
      else setMessage("Failed to update profile.");
    } catch { setMessage("Failed to update profile."); }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your account information.</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
            {profile.name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-semibold">{profile.name || "Client"}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input value={profile.email} disabled
              className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50 text-muted-foreground" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Street Address</label>
          <input value={profile.address.street} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, street: e.target.value } })}
            className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input value={profile.address.city} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, city: e.target.value } })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input value={profile.address.state} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, state: e.target.value } })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input value={profile.address.country} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, country: e.target.value } })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ZIP</label>
            <input value={profile.address.zip} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, zip: e.target.value } })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        </div>

        {message && (
          <p className={cn("text-sm", message.includes("success") ? "text-green-600" : "text-red-600")}>{message}</p>
        )}

        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
