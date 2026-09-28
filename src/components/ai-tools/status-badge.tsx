import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  testing: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  unpublished: "bg-orange-100 text-orange-800",
  archived: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

const ACCESS_STYLES: Record<string, string> = {
  free: "bg-emerald-100 text-emerald-800",
  freemium: "bg-blue-100 text-blue-800",
  subscription: "bg-purple-100 text-purple-800",
};

const ACCESS_LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  subscription: "Subscription",
};

export function AccessBadge({ accessModel }: { accessModel: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs border-transparent ${ACCESS_STYLES[accessModel] || ""}`}
    >
      {ACCESS_LABELS[accessModel] || accessModel}
    </Badge>
  );
}
