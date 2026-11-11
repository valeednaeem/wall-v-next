export default function ProjectsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Projects</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
