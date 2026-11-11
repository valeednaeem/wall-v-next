"use client";

import { useMemo, useState } from "react";
import { Search, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolCard, ToolCardData } from "@/components/tools/ToolCard";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

const ACCESS_OPTIONS = [
  { value: "all", label: "Any access" },
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "subscription", label: "Pro" },
];

export function ToolListContent({
  initialTools,
  initialCategories,
}: {
  initialTools: ToolCardData[];
  initialCategories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [access, setAccess] = useState("all");

  const filtered = useMemo(() => {
    return initialTools.filter((tool) => {
      if (category !== "all" && tool.category?.slug !== category) return false;
      if (access !== "all" && tool.accessModel !== access) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${tool.name} ${tool.shortDescription || ""} ${tool.description || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [initialTools, search, category, access]);

  const hasFilters = search !== "" || category !== "all" || access !== "all";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search AI tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4"
            />
          </div>
        </form>
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={category === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategory("all")}
        >
          All
        </Button>
        {initialCategories.map((cat) => (
          <Button
            key={cat._id}
            variant={category === cat.slug ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ACCESS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={access === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setAccess(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategory("all"); setAccess("all"); }}>
            <X className="h-3 w-3 mr-1" /> Clear all
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tools found</h3>
          <p className="text-muted-foreground mb-4">
            {hasFilters ? "Try adjusting your search or filters." : "No tools published yet. Check back soon!"}
          </p>
          {hasFilters && (
            <Button variant="outline" onClick={() => { setSearch(""); setCategory("all"); setAccess("all"); }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((tool) => (
            <ToolCard key={tool._id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
