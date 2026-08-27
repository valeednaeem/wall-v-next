"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ContactSettings {
  email: string;
  phone: string;
  address: string;
  businessHours: string;
}

export function ContactForm() {
  const [contactInfo, setContactInfo] = useState<ContactSettings>({
    email: "",
    phone: "",
    address: "",
    businessHours: "",
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "general",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.contact) {
          setContactInfo(data.data.contact);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send message");
        return;
      }

      setSuccess(true);
      setForm({ name: "", email: "", phone: "", type: "general", subject: "", message: "" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Have a question or want to discuss a project? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>

            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-6 text-sm text-green-800">
                Your message has been sent successfully. We&apos;ll get back to you soon!
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 mb-6 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="How can we help?"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm min-h-[140px]"
                  placeholder="Tell us about your project..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Get in touch</h2>
            <div className="space-y-6">
              {contactInfo.email && (
                <div>
                  <h3 className="font-medium">Email</h3>
                  <p className="text-muted-foreground">{contactInfo.email}</p>
                </div>
              )}
              {contactInfo.phone && (
                <div>
                  <h3 className="font-medium">Phone</h3>
                  <p className="text-muted-foreground">{contactInfo.phone}</p>
                </div>
              )}
              {contactInfo.address && (
                <div>
                  <h3 className="font-medium">Address</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{contactInfo.address}</p>
                </div>
              )}
              {contactInfo.businessHours && (
                <div>
                  <h3 className="font-medium">Business Hours</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{contactInfo.businessHours}</p>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-xl border bg-muted/30 p-6">
              <h3 className="font-semibold mb-2">Free Consultation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Book a free 30-minute discovery call to discuss your project requirements.
              </p>
              <Link href="/contact" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Book a Call
              </Link>
            </div>

            <div className="mt-8 rounded-xl border overflow-hidden">
              <iframe
                src="https://storage.googleapis.com/maps-solutions-6u16u38so4/locator-plus/ofmi/locator-plus.html"
                width="100%"
                height="300"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Wall-V Office Location"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
