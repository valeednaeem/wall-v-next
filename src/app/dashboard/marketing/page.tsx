export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Marketing</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Campaigns</h3>
          <p className="mt-2 text-sm text-muted-foreground">Manage marketing campaigns</p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Analytics</h3>
          <p className="mt-2 text-sm text-muted-foreground">View marketing analytics</p>
        </div>
      </div>
    </div>
  );
}
