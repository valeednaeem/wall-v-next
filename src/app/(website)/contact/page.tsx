import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Wall-V. We're here to help with your digital projects.",
};

export default function ContactPage() {
  return <ContactForm />;
}
