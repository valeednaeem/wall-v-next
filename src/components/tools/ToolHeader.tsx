import Link from "next/link";
import Image from "next/image";
import { Sparkles, Clock3, Wrench } from "lucide-react";
import { AccessBadge } from "./ToolCard";

export interface ToolHeaderData {
  name: string;
  slug: string;
  shortDescription?: string;
  icon?: string;
  featuredImage?: string;
  accessModel: string;
  category?: { name: string; slug: string };
  flags?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isPopular?: boolean;
    isRecommended?: boolean;
    isComingSoon?: boolean;
  };
}

export function ToolHeader({ tool }: { tool: ToolHeaderData }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
        {tool.featuredImage ? (
          <Image src={tool.featuredImage} alt={tool.name} fill className="object-cover" sizes="80px" />
        ) : (
          <Wrench className="h-9 w-9 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <AccessBadge accessModel={tool.accessModel} />
          {tool.category && (
            <Link
              href={`/tools?category=${tool.category.slug}`}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors"
            >
              {tool.category.name}
            </Link>
          )}
          {tool.flags?.isFeatured && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          {tool.flags?.isNew && (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-white">New</span>
          )}
          {tool.flags?.isComingSoon && (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" /> Coming Soon
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
        {tool.shortDescription && (
          <p className="mt-2 text-muted-foreground">{tool.shortDescription}</p>
        )}
      </div>
    </div>
  );
}
