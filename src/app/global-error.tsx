"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h1 className="text-6xl font-bold">Error</h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Something went wrong.
          </p>
          <button
            onClick={() => reset()}
            className="mt-8 rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
