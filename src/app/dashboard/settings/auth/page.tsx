"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Shield, Key, Smartphone, Eye, EyeOff, CheckCircle, AlertTriangle, Link2, Unlink } from "lucide-react";

interface SecurityData {
  password: { current: string; newPass: string; confirm: string };
  twoFactorEnabled: boolean;
  loginHistory: {
    ip: string;
    device: string;
    browser: string;
    location: string;
    timestamp: string;
    current: boolean;
  }[];
  linkedAccounts: {
    provider: string;
    connected: boolean;
    email: string;
    lastSync: string;
  }[];
  sessions: {
    id: string;
    device: string;
    browser: string;
    ip: string;
    lastActive: string;
    current: boolean;
  }[];
}

export default function SecuritySettingsPage() {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"password" | "2fa" | "logins" | "sessions" | "oauth">("password");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [security, setSecurity] = useState<SecurityData>({
    password: { current: "", newPass: "", confirm: "" },
    twoFactorEnabled: false,
    loginHistory: [],
    linkedAccounts: [],
    sessions: [],
  });

  useEffect(() => {
    fetch("/api/settings/security")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSecurity((prev) => ({ ...prev, ...d.data })); })
      .catch(() => {});
  }, []);

  const handlePasswordChange = async () => {
    if (security.password.newPass !== security.password.confirm) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "password", current: security.password.current, newPass: security.password.newPass }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurity((prev) => ({ ...prev, password: { current: "", newPass: "", confirm: "" } }));
      }
    } catch (e) { console.error("Password change error:", e); }
    setTimeout(() => setSaving(false), 800);
  };

  const handleToggle2FA = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "2fa", enabled: !security.twoFactorEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurity((prev) => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
      }
    } catch (e) { console.error("2FA toggle error:", e); }
    setTimeout(() => setSaving(false), 800);
  };

  const handleToggleOAuth = async (provider: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "oauth", provider }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurity((prev) => ({
          ...prev,
          linkedAccounts: prev.linkedAccounts.map((a) =>
            a.provider === provider ? { ...a, connected: !a.connected } : a
          ),
        }));
      }
    } catch (e) { console.error("OAuth toggle error:", e); }
    setTimeout(() => setSaving(false), 800);
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSaving(true);
    try {
      await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "revoke-session", sessionId }),
      });
      setSecurity((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) }));
    } catch {}
    setTimeout(() => setSaving(false), 800);
  };

  const providerLabels: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    facebook: "Facebook",
    linkedin: "LinkedIn",
  };

  const providerColors: Record<string, string> = {
    google: "bg-red-50 text-red-600",
    github: "bg-gray-50 text-gray-800",
    facebook: "bg-blue-50 text-blue-600",
    linkedin: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {[
          { id: "password" as const, label: "Password", icon: Key },
          { id: "2fa" as const, label: "2FA", icon: Smartphone },
          { id: "sessions" as const, label: "Sessions", icon: Shield },
          { id: "logins" as const, label: "Login History", icon: Shield },
          { id: "oauth" as const, label: "Linked Accounts", icon: Link2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Password */}
      {activeTab === "password" && (
        <div className="rounded-lg border p-6 space-y-4 max-w-lg">
          <h3 className="font-semibold">Change Password</h3>
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <div className="relative mt-1">
              <input type={showCurrentPass ? "text" : "password"} value={security.password.current} onChange={(e) => setSecurity({ ...security, password: { ...security.password, current: e.target.value } })} className="w-full rounded-lg border px-3 py-2 text-sm pr-10" />
              <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <div className="relative mt-1">
              <input type={showNewPass ? "text" : "password"} value={security.password.newPass} onChange={(e) => setSecurity({ ...security, password: { ...security.password, newPass: e.target.value } })} className="w-full rounded-lg border px-3 py-2 text-sm pr-10" />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
                {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {security.password.newPass && (
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${security.password.newPass.length >= i * 4 ? "bg-green-500" : "bg-gray-200"}`} />
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <input type="password" value={security.password.confirm} onChange={(e) => setSecurity({ ...security, password: { ...security.password, confirm: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            {security.password.confirm && security.password.newPass !== security.password.confirm && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
          <button onClick={handlePasswordChange} disabled={saving || !security.password.current || !security.password.newPass || security.password.newPass !== security.password.confirm} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update Password
          </button>
        </div>
      )}

      {/* Two-Factor */}
      {activeTab === "2fa" && (
        <div className="rounded-lg border p-6 space-y-4 max-w-lg">
          <h3 className="font-semibold">Two-Factor Authentication</h3>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">{security.twoFactorEnabled ? "2FA is Enabled" : "2FA is Disabled"}</p>
              <p className="text-xs text-muted-foreground mt-1">Add an extra layer of security to your account</p>
            </div>
            <button onClick={handleToggle2FA} disabled={saving} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${security.twoFactorEnabled ? "bg-primary" : "bg-gray-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${security.twoFactorEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {security.twoFactorEnabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Two-factor authentication is active. You will need your authenticator app to log in.</p>
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Keep your backup codes in a safe place. You will need them if you lose access to your authenticator.</p>
          </div>
        </div>
      )}

      {/* Sessions */}
      {activeTab === "sessions" && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Active Sessions</h3>
          <div className="space-y-3">
            {security.sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.device} — {s.browser}</p>
                    <p className="text-xs text-muted-foreground">IP: {s.ip} • Last active: {s.lastActive}</p>
                  </div>
                </div>
                {s.current ? (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">Current</span>
                ) : (
                  <button onClick={() => handleRevokeSession(s.id)} className="text-xs text-destructive hover:underline">Revoke</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login History */}
      {activeTab === "logins" && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Login History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Device</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {security.loginHistory.map((login, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3">{login.device} — {login.browser}</td>
                    <td className="py-3 font-mono text-xs">{login.ip}</td>
                    <td className="py-3">{login.location}</td>
                    <td className="py-3 text-muted-foreground">{new Date(login.timestamp).toLocaleDateString()}</td>
                    <td className="py-3">
                      {login.current ? (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Current</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Success</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OAuth / Linked Accounts */}
      {activeTab === "oauth" && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Linked Accounts</h3>
          <p className="text-sm text-muted-foreground">Connect your accounts for easy sign-in and profile syncing.</p>
          <div className="space-y-3">
            {security.linkedAccounts.map((account) => (
              <div key={account.provider} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${providerColors[account.provider] || "bg-gray-50 text-gray-600"}`}>
                    {providerLabels[account.provider]?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{providerLabels[account.provider]}</p>
                    <p className="text-xs text-muted-foreground">{account.connected ? account.email : "Not connected"}</p>
                  </div>
                </div>
                {account.connected ? (
                  <button onClick={() => handleToggleOAuth(account.provider)} disabled={saving} className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline">
                    <Unlink className="h-3 w-3" />
                    Disconnect
                  </button>
                ) : (
                  <button onClick={() => handleToggleOAuth(account.provider)} disabled={saving} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Link2 className="h-3 w-3" />
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
