import Link from "next/link";

const footerSections = [
  {
    title: "Services",
    links: [
      { name: "AI Automation", href: "/services" },
      { name: "Web Hosting", href: "/hosting" },
      { name: "Domain Names", href: "/hosting" },
      { name: "Web Development", href: "/services" },
      { name: "ERP & CRM", href: "/services" },
      { name: "Maintenance", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Help Center", href: "/contact" },
      { name: "Documentation", href: "/docs" },
      { name: "Knowledge Base", href: "/kb" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms & Conditions", href: "/terms" },
      { name: "Disclaimer", href: "/disclaimer" },
      { name: "Refund Policy", href: "/refund" },
      { name: "Cookie Policy", href: "/cookie-policy" },
      { name: "Accessibility", href: "/accessibility" },
      { name: "AI Usage & Limitations", href: "/ai-usage" },
      { name: "Sitemap", href: "/sitemap" },
    ],
  },
];

const socialLinks = [
  { name: "Facebook", href: "#" },
  { name: "Twitter", href: "#" },
  { name: "LinkedIn", href: "#" },
  { name: "Instagram", href: "#" },
  { name: "GitHub", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-4 lg:items-start">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">
                <span className="text-primary">Wall</span>-V
              </span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">
              AI-powered software agency providing custom software development, AI automation,
              ERP/CRM solutions, web hosting, and digital products.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {social.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 font-semibold text-sm">{section.title}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="hover:text-primary transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border-t pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Wall-V. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/cookie-policy" className="hover:text-primary">Cookies</Link>
            <Link href="/sitemap" className="hover:text-primary">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
