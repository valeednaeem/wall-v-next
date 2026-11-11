import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <Link href="/" className="flex items-center justify-center gap-2 text-3xl font-bold mb-6">
            <span className="text-primary">Wall</span>-V
          </Link>
          <h2 className="text-2xl font-semibold">AI-Powered Digital Agency</h2>
          <p className="mt-4 text-muted-foreground">
            Build, automate, and scale your digital presence with our AI-powered platform.
          </p>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
