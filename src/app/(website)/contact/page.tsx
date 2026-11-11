import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
import { generateSEO } from "@/lib/seo";

export const metadata: Metadata = generateSEO({
  title: "Contact Us",
  description: "Get in touch with Wall-V. We're here to help with your digital projects.",
  url: "/contact",
  keywords: ["contact wall-v", "get in touch", "digital agency contact", "project inquiry"],
});

export default function ContactPage() {
  return <ContactForm />;
}
