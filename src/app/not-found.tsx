import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist or has been moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        Go Home
      </Link>
    </div>
  );
}
