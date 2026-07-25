export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Product Categories</h2>
        <a
          href="/dashboard/ecommerce/products/categories/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Add Category
        </a>
      </div>
      <div className="rounded-lg border">
        <div className="p-4 text-center text-sm text-muted-foreground">
          No categories yet. Create your first category to get started.
        </div>
      </div>
    </div>
  );
}
