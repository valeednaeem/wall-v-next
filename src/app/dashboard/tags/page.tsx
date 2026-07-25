export default function TagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tags</h2>
        <a
          href="/dashboard/tags/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Tag
        </a>
      </div>
      <div className="rounded-lg border">
        <div className="p-4 text-center text-sm text-muted-foreground">
          No tags yet. Create your first tag to get started.
        </div>
      </div>
    </div>
  );
}
