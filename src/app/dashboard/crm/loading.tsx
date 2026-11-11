export default function CMLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">CRM</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
