import Link from "next/link";
import Image from "next/image";
import { Sparkles, Clock3, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface ToolCardData {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  featuredImage?: string;
  accessModel: "free" | "freemium" | "subscription";
  status: string;
  category?: { name: string; slug: string };
  flags?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isPopular?: boolean;
    isRecommended?: boolean;
    isComingSoon?: boolean;
  };
}

export function AccessBadge({ accessModel }: { accessModel: string }) {
  if (accessModel === "free") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">FREE</Badge>;
  }
  if (accessModel === "freemium") {
    return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">FREEMIUM</Badge>;
  }
  return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">PRO</Badge>;
}

export function ToolCard({ tool }: { tool: ToolCardData }) {
  const comingSoon = Boolean(tool.flags?.isComingSoon);
  const text = tool.shortDescription || tool.description?.slice(0, 160) || "";
  const body = (
    <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg group">
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {tool.featuredImage ? (
          <Image
            src={tool.featuredImage}
            alt={tool.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Wrench className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <AccessBadge accessModel={tool.accessModel} />
          {tool.flags?.isFeatured && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
              <Sparkles className="h-3 w-3 mr-0.5" /> Featured
            </Badge>
          )}
          {tool.flags?.isNew && <Badge className="bg-slate-700 hover:bg-slate-800 text-white">New</Badge>}
          {comingSoon && (
            <Badge variant="secondary" className="gap-1">
              <Clock3 className="h-3 w-3" /> Coming Soon
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          {tool.category && (
            <Badge variant="secondary" className="text-xs">{tool.category.name}</Badge>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {tool.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{text}</p>
        <span className="mt-4 text-sm font-medium text-primary group-hover:underline">
          {comingSoon ? "Notify me soon" : "Open tool →"}
        </span>
      </CardContent>
    </Card>
  );

  if (comingSoon) {
    return <div className="opacity-70 h-full cursor-not-allowed" aria-disabled>{body}</div>;
  }
  return <Link href={`/tools/${tool.slug}`} className="block h-full">{body}</Link>;
}
