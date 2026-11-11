export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
