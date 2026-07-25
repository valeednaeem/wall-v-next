export default function ContentManagementPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Content Management</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <a href="/dashboard/contentManagement/blogPosts" className="rounded-lg border p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold">Blog Posts</h3>
          <p className="mt-2 text-sm text-muted-foreground">Manage blog content</p>
        </a>
        <a href="/dashboard/contentManagement/Pages" className="rounded-lg border p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold">Pages</h3>
          <p className="mt-2 text-sm text-muted-foreground">Manage website pages</p>
        </a>
        <a href="/dashboard/contentManagement/services" className="rounded-lg border p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold">Services</h3>
          <p className="mt-2 text-sm text-muted-foreground">Manage service offerings</p>
        </a>
      </div>
    </div>
  );
}
