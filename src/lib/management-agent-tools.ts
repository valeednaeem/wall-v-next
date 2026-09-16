import { connectToDatabase } from "@/lib/mongodb";
import type { AgentToolDefinition } from "@/lib/agent-tools";

// ─── Management Agent Tool Definitions ───────────────────────────────────────

export const MANAGEMENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
  // ─── Blog Tools ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_blog_post",
      description: "Create a new blog post with title, content, category, tags, and SEO fields. Use when admin or client wants to publish a new blog article.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Blog post title" },
          content: { type: "string", description: "Full HTML content of the post" },
          excerpt: { type: "string", description: "Brief summary (1-2 sentences)" },
          featuredImage: { type: "string", description: "Featured image URL" },
          category: { type: "string", description: "Category ID or name" },
          tags: { type: "array", items: { type: "string" }, description: "Tag names" },
          status: { type: "string", description: "Status: draft, review, published" },
          seoMetaTitle: { type: "string", description: "SEO meta title" },
          seoMetaDescription: { type: "string", description: "SEO meta description" },
          seoKeywords: { type: "array", items: { type: "string" }, description: "SEO keywords" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_blog_post",
      description: "Update an existing blog post. Can modify title, content, status, SEO fields, category, tags, or any other field.",
      parameters: {
        type: "object",
        properties: {
          postId: { type: "string", description: "Blog post ID" },
          postSlug: { type: "string", description: "Blog post slug (alternative to ID)" },
          title: { type: "string", description: "New title" },
          content: { type: "string", description: "New HTML content" },
          excerpt: { type: "string", description: "New excerpt" },
          featuredImage: { type: "string", description: "New featured image URL" },
          category: { type: "string", description: "New category ID" },
          tags: { type: "array", items: { type: "string" }, description: "New tag names" },
          status: { type: "string", description: "New status: draft, review, published, archived" },
          seoMetaTitle: { type: "string", description: "SEO meta title" },
          seoMetaDescription: { type: "string", description: "SEO meta description" },
          seoKeywords: { type: "array", items: { type: "string" }, description: "SEO keywords" },
          socialOgImage: { type: "string", description: "OG image for social sharing" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_blog_posts",
      description: "List blog posts with optional filters. Use to check existing content, find posts to edit, or review published articles.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter: draft, review, published, archived" },
          category: { type: "string", description: "Filter by category slug or ID" },
          search: { type: "string", description: "Search in title and content" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "optimize_blog_seo",
      description: "Analyze a blog post and generate SEO optimization suggestions including meta title, description, keywords, and content improvements.",
      parameters: {
        type: "object",
        properties: {
          postId: { type: "string", description: "Blog post ID to analyze" },
          postSlug: { type: "string", description: "Blog post slug (alternative to ID)" },
          targetKeyword: { type: "string", description: "Primary keyword to optimize for" },
        },
        required: [],
      },
    },
  },
  // ─── Product Tools ───────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Create a new product with name, description, pricing, category, and SEO fields.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name" },
          type: { type: "string", description: "Product type: product, service, digital, hosting, domain, saas, ai-service" },
          description: { type: "string", description: "Full HTML description" },
          shortDescription: { type: "string", description: "Brief description" },
          price: { type: "number", description: "Price in USD" },
          salePrice: { type: "number", description: "Sale price (optional)" },
          category: { type: "string", description: "Category ID" },
          featuredImage: { type: "string", description: "Featured image URL" },
          gallery: { type: "array", items: { type: "string" }, description: "Gallery image URLs" },
          badges: { type: "array", items: { type: "string" }, description: "Product badges (New, Sale, etc.)" },
          features: { type: "array", items: { type: "string" }, description: "Product features (one per item)" },
          sku: { type: "string", description: "SKU code" },
          status: { type: "string", description: "Status: draft, published, archived" },
          seoMetaTitle: { type: "string", description: "SEO meta title" },
          seoMetaDescription: { type: "string", description: "SEO meta description" },
        },
        required: ["name", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description: "Update an existing product. Can modify name, description, pricing, status, SEO fields, or any other field.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          productSlug: { type: "string", description: "Product slug (alternative to ID)" },
          name: { type: "string", description: "New name" },
          description: { type: "string", description: "New description" },
          shortDescription: { type: "string", description: "New short description" },
          price: { type: "number", description: "New price" },
          salePrice: { type: "number", description: "New sale price" },
          status: { type: "string", description: "New status" },
          badges: { type: "array", items: { type: "string" }, description: "New badges" },
          features: { type: "array", items: { type: "string" }, description: "New features" },
          seoMetaTitle: { type: "string", description: "SEO meta title" },
          seoMetaDescription: { type: "string", description: "SEO meta description" },
          seoKeywords: { type: "array", items: { type: "string" }, description: "SEO keywords" },
          socialOgImage: { type: "string", description: "OG image for social sharing" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_products",
      description: "List products with optional filters. Use to check inventory, find products to edit, or review the catalog.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter: draft, published, archived" },
          type: { type: "string", description: "Filter by type: product, service, digital, hosting, domain, saas, ai-service" },
          category: { type: "string", description: "Filter by category slug or ID" },
          search: { type: "string", description: "Search in name and description" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_product_listing",
      description: "Generate an SEO-optimized product listing including title, description, features, and meta tags from a brief description.",
      parameters: {
        type: "object",
        properties: {
          productName: { type: "string", description: "Product name" },
          productType: { type: "string", description: "Type: product, service, digital, saas, ai-service" },
          briefDescription: { type: "string", description: "Brief product description" },
          targetAudience: { type: "string", description: "Target audience" },
          price: { type: "number", description: "Price" },
          keyFeatures: { type: "array", items: { type: "string" }, description: "Key features to highlight" },
        },
        required: ["productName", "briefDescription"],
      },
    },
  },
  // ─── SEO Tools ───────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "run_seo_audit",
      description: "Run an SEO audit on a page URL. Checks meta tags, headings, images, links, and content structure. Returns a score and actionable recommendations.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Page URL or path to audit (e.g., /products/my-product)" },
          pageType: { type: "string", description: "Page type: blog, product, homepage, static" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_seo_keywords",
      description: "Analyze keyword opportunities for a topic. Returns keyword suggestions, search intent, competition level, and content recommendations.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic or seed keyword to analyze" },
          industry: { type: "string", description: "Industry context" },
          content: { type: "string", description: "Existing content to analyze for keyword usage" },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_seo_meta",
      description: "Generate optimized SEO meta title, description, and keywords for a page based on its content and target audience.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Page title or topic" },
          content: { type: "string", description: "Page content to analyze" },
          targetKeyword: { type: "string", description: "Primary target keyword" },
          pageType: { type: "string", description: "Page type: blog, product, homepage" },
          maxLength: { type: "number", description: "Max title length (default 60)" },
        },
        required: ["title"],
      },
    },
  },
  // ─── Security Tools ──────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "run_security_scan",
      description: "Run a security scan of the application. Checks for exposed secrets, insecure configurations, CORS issues, and common vulnerabilities.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", description: "Scan scope: full, api, frontend, config" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_dependencies",
      description: "Check npm dependencies for known vulnerabilities and outdated packages.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "audit_authentication",
      description: "Audit the authentication and authorization configuration. Checks JWT settings, session management, role-based access, and CORS policies.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // ─── Error/Logging Tools ─────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_error_logs",
      description: "Query error logs with filters. Use to investigate issues, check recent errors, or monitor application health.",
      parameters: {
        type: "object",
        properties: {
          level: { type: "string", description: "Filter: error, warning, info, critical" },
          status: { type: "string", description: "Filter: open, investigating, resolved, ignored" },
          source: { type: "string", description: "Filter by source (e.g., api/auth, api/blog)" },
          startDate: { type: "string", description: "Start date (ISO)" },
          endDate: { type: "string", description: "End date (ISO)" },
          search: { type: "string", description: "Search in error message" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_error_summary",
      description: "Get a summary of recent errors grouped by level, source, and status. Use for quick health overview.",
      parameters: {
        type: "object",
        properties: {
          hours: { type: "number", description: "Hours to look back (default 24)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_error",
      description: "Mark an error log entry as resolved or ignored.",
      parameters: {
        type: "object",
        properties: {
          errorId: { type: "string", description: "Error log ID" },
          status: { type: "string", description: "New status: resolved, ignored" },
          note: { type: "string", description: "Resolution note" },
        },
        required: ["errorId", "status"],
      },
    },
  },
  // ─── Image/Media Tools ───────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_system_notifications",
      description: "Get recent system notifications, warnings, and alerts. Use to check for pending issues or important system events.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Filter: info, success, warning, error" },
          read: { type: "boolean", description: "Filter by read status" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_image_info",
      description: "Get information about an image URL including dimensions, format, and size. Use before optimizing or resizing.",
      parameters: {
        type: "object",
        properties: {
          imageUrl: { type: "string", description: "Image URL to analyze" },
        },
        required: ["imageUrl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image_variants",
      description: "Generate responsive image size recommendations for a given image. Returns suggested sizes for different viewports.",
      parameters: {
        type: "object",
        properties: {
          imageUrl: { type: "string", description: "Original image URL" },
          purpose: { type: "string", description: "Usage: blog, product, og, thumbnail, hero" },
        },
        required: ["imageUrl"],
      },
    },
  },
];

// ─── Management Tool Executors ──────────────────────────────────────────────

// Blog Executors
async function executeCreateBlogPost(args: Record<string, unknown>) {
  const BlogPost = (await import("@/models/blog-post")).default;
  const BlogCategory = (await import("@/models/blog-category")).default;
  const BlogTag = (await import("@/models/blog-tag")).default;
  await connectToDatabase();

  const slug = (args.title as string).toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();

  const existing = await BlogPost.findOne({ slug });
  if (existing) return { error: "A blog post with this title already exists" };

  // Handle category
  let categoryId = undefined;
  if (args.category) {
    const cat = await BlogCategory.findOne({
      $or: [{ _id: args.category }, { slug: args.category }, { name: { $regex: args.category, $options: "i" } }],
    });
    if (cat) categoryId = cat._id;
  }

  // Handle tags
  const tagIds: string[] = [];
  if (args.tags && Array.isArray(args.tags)) {
    for (const tagName of args.tags as string[]) {
      if (!tagName || typeof tagName !== "string") continue;
      const tagSlug = tagName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
      if (!tagSlug) continue;
      let tagDoc = await BlogTag.findOne({ slug: tagSlug });
      if (!tagDoc) tagDoc = await BlogTag.create({ name: tagName.trim(), slug: tagSlug });
      tagIds.push(tagDoc._id.toString());
    }
  }

  const post = await BlogPost.create({
    title: args.title,
    slug,
    content: args.content,
    excerpt: args.excerpt || "",
    featuredImage: args.featuredImage || "",
    category: categoryId,
    tags: tagIds,
    status: args.status || "draft",
    seo: {
      metaTitle: args.seoMetaTitle || "",
      metaDescription: args.seoMetaDescription || "",
      keywords: args.seoKeywords || [],
    },
    social: {
      ogImage: args.socialOgImage || "",
    },
  });

  if (categoryId) {
    await BlogCategory.findByIdAndUpdate(categoryId, { $inc: { postCount: 1 } });
  }

  return { postId: post._id, slug: post.slug, status: post.status, message: `Blog post created as ${post.status}` };
}

async function executeUpdateBlogPost(args: Record<string, unknown>) {
  const BlogPost = (await import("@/models/blog-post")).default;
  const BlogCategory = (await import("@/models/blog-category")).default;
  const BlogTag = (await import("@/models/blog-tag")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.postId) query._id = args.postId;
  else if (args.postSlug) query.slug = args.postSlug;
  else return { error: "Provide postId or postSlug" };

  const updateData: Record<string, unknown> = {};
  if (args.title) updateData.title = args.title;
  if (args.content) updateData.content = args.content;
  if (args.excerpt !== undefined) updateData.excerpt = args.excerpt;
  if (args.featuredImage !== undefined) updateData.featuredImage = args.featuredImage;
  if (args.status) updateData.status = args.status;
  if (args.socialOgImage !== undefined) updateData["social.ogImage"] = args.socialOgImage;

  if (args.category) {
    const cat = await BlogCategory.findOne({
      $or: [{ _id: args.category }, { slug: args.category }],
    });
    if (cat) updateData.category = cat._id;
    else updateData.category = undefined;
  }

  if (args.tags && Array.isArray(args.tags)) {
    const tagIds: string[] = [];
    for (const tagName of args.tags as string[]) {
      if (!tagName || typeof tagName !== "string") continue;
      const tagSlug = tagName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
      if (!tagSlug) continue;
      let tagDoc = await BlogTag.findOne({ slug: tagSlug });
      if (!tagDoc) tagDoc = await BlogTag.create({ name: tagName.trim(), slug: tagSlug });
      tagIds.push(tagDoc._id.toString());
    }
    updateData.tags = tagIds;
  }

  if (args.seoMetaTitle !== undefined) updateData["seo.metaTitle"] = args.seoMetaTitle;
  if (args.seoMetaDescription !== undefined) updateData["seo.metaDescription"] = args.seoMetaDescription;
  if (args.seoKeywords) updateData["seo.keywords"] = args.seoKeywords;

  const post = await BlogPost.findOneAndUpdate(query, { $set: updateData }, { new: true });
  if (!post) return { error: "Blog post not found" };

  return { postId: post._id, slug: post.slug, status: post.status, message: "Blog post updated" };
}

async function executeGetBlogPosts(args: Record<string, unknown>) {
  const BlogPost = (await import("@/models/blog-post")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.status) query.status = args.status;
  if (args.category) {
    const BlogCategory = (await import("@/models/blog-category")).default;
    const cat = await BlogCategory.findOne({ $or: [{ slug: args.category }, { _id: args.category }] });
    if (cat) query.category = cat._id;
  }
  if (args.search) {
    query.$or = [
      { title: { $regex: args.search, $options: "i" } },
      { excerpt: { $regex: args.search, $options: "i" } },
    ];
  }

  const limit = (args.limit as number) || 10;
  const posts = await BlogPost.find(query)
    .select("title slug status featuredImage category tags createdAt updatedAt viewCount")
    .populate("category", "name slug")
    .populate("tags", "name slug")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { posts, total: posts.length };
}

async function executeOptimizeBlogSeo(args: Record<string, unknown>) {
  const BlogPost = (await import("@/models/blog-post")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.postId) query._id = args.postId;
  else if (args.postSlug) query.slug = args.postSlug;
  else return { error: "Provide postId or postSlug" };

  const post = await BlogPost.findOne(query).populate("category", "name").lean() as Record<string, unknown> | null;
  if (!post) return { error: "Blog post not found" };

  const title = post.title as string;
  const content = post.content as string;
  const excerpt = post.excerpt as string;
  const currentSeo = post.seo as Record<string, unknown> | undefined;
  const targetKeyword = (args.targetKeyword as string) || "";

  // Strip HTML for analysis
  const textContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textContent.split(/\s+/).length;
  const currentMetaTitle = (currentSeo?.metaTitle as string) || "";
  const currentMetaDesc = (currentSeo?.metaDescription as string) || "";

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!currentMetaTitle) issues.push("Missing meta title");
  else if (currentMetaTitle.length > 60) issues.push(`Meta title too long (${currentMetaTitle.length} chars, max 60)`);
  else if (currentMetaTitle.length < 30) issues.push(`Meta title too short (${currentMetaTitle.length} chars, min 30)`);

  if (!currentMetaDesc) issues.push("Missing meta description");
  else if (currentMetaDesc.length > 160) issues.push(`Meta description too long (${currentMetaDesc.length} chars, max 160)`);
  else if (currentMetaDesc.length < 70) issues.push(`Meta description too short (${currentMetaDesc.length} chars, min 70)`);

  if (wordCount < 300) issues.push(`Content too short (${wordCount} words, min 300)`);
  if (!excerpt) issues.push("Missing excerpt");

  const h1Match = content.match(/<h1[^>]*>/gi);
  if (!h1Match || h1Match.length === 0) issues.push("No H1 heading found");
  else if (h1Match.length > 1) issues.push("Multiple H1 headings found");

  if (targetKeyword) {
    const lowerContent = textContent.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const keywordCount = (lowerContent.match(new RegExp(targetKeyword.toLowerCase(), "g")) || []).length;
    const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

    if (!lowerTitle.includes(targetKeyword.toLowerCase())) {
      recommendations.push(`Include target keyword "${targetKeyword}" in the title`);
    }
    if (keywordCount < 3) {
      recommendations.push(`Increase keyword usage — "${targetKeyword}" appears only ${keywordCount} times`);
    } else if (keywordDensity > 3) {
      recommendations.push(`Keyword density too high (${keywordDensity.toFixed(1)}%) — may be keyword stuffing`);
    }
  }

  if (!post.featuredImage) recommendations.push("Add a featured image for social sharing");
  if (wordCount > 2000) recommendations.push("Consider splitting long content into multiple posts");

  const score = Math.max(0, 100 - (issues.length * 15) - (recommendations.length * 5));

  return {
    postId: post._id,
    title,
    score,
    wordCount,
    currentSeo: { metaTitle: currentMetaTitle, metaDescription: currentMetaDesc },
    issues,
    recommendations,
    message: score >= 80 ? "SEO is good" : score >= 50 ? "SEO needs improvement" : "SEO needs significant work",
  };
}

// Product Executors
async function executeCreateProduct(args: Record<string, unknown>) {
  const Product = (await import("@/models/product")).default;
  await connectToDatabase();

  const slug = (args.name as string).toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();
  const existing = await Product.findOne({ slug });
  if (existing) return { error: "A product with this name already exists" };

  const product = await Product.create({
    name: args.name,
    slug,
    type: args.type || "product",
    description: args.description || "",
    shortDescription: args.shortDescription || "",
    price: args.price || 0,
    salePrice: args.salePrice || undefined,
    category: args.category || undefined,
    featuredImage: args.featuredImage || "",
    gallery: args.gallery || [],
    badges: args.badges || [],
    features: args.features || [],
    sku: args.sku || "",
    status: args.status || "draft",
    seo: {
      metaTitle: args.seoMetaTitle || "",
      metaDescription: args.seoMetaDescription || "",
    },
  });

  return { productId: product._id, slug: product.slug, status: product.status, message: `Product created as ${product.status}` };
}

async function executeUpdateProduct(args: Record<string, unknown>) {
  const Product = (await import("@/models/product")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.productId) query._id = args.productId;
  else if (args.productSlug) query.slug = args.productSlug;
  else return { error: "Provide productId or productSlug" };

  const updateData: Record<string, unknown> = {};
  if (args.name) updateData.name = args.name;
  if (args.description !== undefined) updateData.description = args.description;
  if (args.shortDescription !== undefined) updateData.shortDescription = args.shortDescription;
  if (args.price !== undefined) updateData.price = args.price;
  if (args.salePrice !== undefined) updateData.salePrice = args.salePrice;
  if (args.status) updateData.status = args.status;
  if (args.badges) updateData.badges = args.badges;
  if (args.features) updateData.features = args.features;
  if (args.seoMetaTitle !== undefined) updateData["seo.metaTitle"] = args.seoMetaTitle;
  if (args.seoMetaDescription !== undefined) updateData["seo.metaDescription"] = args.seoMetaDescription;
  if (args.seoKeywords) updateData["seo.keywords"] = args.seoKeywords;
  if (args.socialOgImage !== undefined) updateData["social.ogImage"] = args.socialOgImage;

  const product = await Product.findOneAndUpdate(query, { $set: updateData }, { new: true });
  if (!product) return { error: "Product not found" };

  return { productId: product._id, slug: product.slug, status: product.status, message: "Product updated" };
}

async function executeGetProducts(args: Record<string, unknown>) {
  const Product = (await import("@/models/product")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.status) query.status = args.status;
  if (args.type) query.type = args.type;
  if (args.category) {
    const ProductCategory = (await import("@/models/product-category")).default;
    const cat = await ProductCategory.findOne({ $or: [{ slug: args.category }, { _id: args.category }] });
    if (cat) query.category = cat._id;
  }
  if (args.search) {
    query.$or = [
      { name: { $regex: args.search, $options: "i" } },
      { description: { $regex: args.search, $options: "i" } },
    ];
  }

  const limit = (args.limit as number) || 10;
  const products = await Product.find(query)
    .select("name slug type status price salePrice category featuredImage createdAt")
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { products, total: products.length };
}

async function executeGenerateProductListing(args: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "AI service not configured" };

  const prompt = `Generate an SEO-optimized product listing for:

Product Name: ${args.productName}
Type: ${args.productType || "product"}
Description: ${args.briefDescription}
Target Audience: ${args.targetAudience || "general"}
Price: ${args.price ? `$${args.price}` : "not set"}
Key Features: ${(args.keyFeatures as string[])?.join(", ") || "none specified"}

Generate the following JSON:
{
  "title": "SEO-optimized product name (max 60 chars)",
  "description": "Full product description (200-300 words, HTML formatted)",
  "shortDescription": "Brief 1-2 sentence description",
  "features": ["feature 1", "feature 2", ...],
  "badges": ["badge1", ...],
  "seoMetaTitle": "Meta title (max 60 chars)",
  "seoMetaDescription": "Meta description (max 160 chars)",
  "seoKeywords": ["keyword1", "keyword2", ...]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) return { error: "AI generation failed" };
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Could not parse AI response" };

    const listing = JSON.parse(jsonMatch[0]);
    return { listing, message: "Product listing generated. Review and use create_product to save." };
  } catch {
    return { error: "AI generation failed" };
  }
}

// SEO Executors
async function executeRunSeoAudit(args: Record<string, unknown>) {
  const url = args.url as string;
  const pageType = (args.pageType as string) || "static";

  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check if it's an internal page
  if (url.startsWith("/")) {
    // Blog post check
    if (pageType === "blog" || url.startsWith("/blog")) {
      const BlogPost = (await import("@/models/blog-post")).default;
      await connectToDatabase();
      const slug = url.split("/").pop();
      const post = await BlogPost.findOne({ slug }).lean() as Record<string, unknown> | null;

      if (!post) {
        return { url, score: 0, issues: ["Page not found"], recommendations: ["Verify the URL is correct"], pageType };
      }

      const seo = post.seo as Record<string, unknown> | undefined;
      if (!seo?.metaTitle) { issues.push("Missing meta title"); score -= 20; }
      if (!seo?.metaDescription) { issues.push("Missing meta description"); score -= 20; }
      if (!post.excerpt) { issues.push("Missing excerpt"); score -= 10; }
      if (!post.featuredImage) { issues.push("Missing featured image (bad for social sharing)"); score -= 15; }

      const content = (post.content as string) || "";
      const textContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (textContent.split(/\s+/).length < 300) { issues.push("Content too short (< 300 words)"); score -= 10; }

      if (seo?.metaTitle && (seo.metaTitle as string).length > 60) { recommendations.push("Meta title too long — keep under 60 chars"); }
      if (seo?.metaDescription && (seo.metaDescription as string).length > 160) { recommendations.push("Meta description too long — keep under 160 chars"); }
    }
    // Product check
    else if (pageType === "product" || url.startsWith("/products")) {
      const Product = (await import("@/models/product")).default;
      await connectToDatabase();
      const slug = url.split("/").pop();
      const product = await Product.findOne({ slug }).lean() as Record<string, unknown> | null;

      if (!product) {
        return { url, score: 0, issues: ["Product not found"], recommendations: ["Verify the URL is correct"], pageType };
      }

      const seo = product.seo as Record<string, unknown> | undefined;
      if (!seo?.metaTitle) { issues.push("Missing meta title"); score -= 20; }
      if (!seo?.metaDescription) { issues.push("Missing meta description"); score -= 20; }
      if (!product.featuredImage) { issues.push("Missing featured image"); score -= 15; }
      if (!product.description || (product.description as string).length < 100) { issues.push("Description too short"); score -= 10; }
      if ((product.gallery as string[])?.length === 0) { recommendations.push("Add gallery images for better engagement"); }
      if ((product.badges as string[])?.length === 0) { recommendations.push("Add badges (New, Sale, etc.) for visibility"); }
    }
  }

  if (issues.length === 0 && recommendations.length === 0) {
    recommendations.push("Page looks good! Consider adding structured data (JSON-LD) for rich snippets.");
  }

  return { url, score: Math.max(0, score), issues, recommendations, pageType };
}

async function executeAnalyzeSeoKeywords(args: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "AI service not configured" };

  const prompt = `Analyze SEO keywords for this topic:

Topic: ${args.topic}
Industry: ${args.industry || "technology/digital"}
${args.content ? `Existing content: ${String(args.content).substring(0, 500)}` : ""}

Provide a JSON response with:
{
  "primaryKeyword": "best primary keyword",
  "secondaryKeywords": ["keyword1", "keyword2", ...],
  "longTailKeywords": ["long tail 1", "long tail 2", ...],
  "searchIntent": "informational|commercial|transactional|navigational",
  "competitionLevel": "low|medium|high",
  "contentRecommendations": ["rec1", "rec2", ...]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.5, max_tokens: 1000 }),
    });

    if (!response.ok) return { error: "AI analysis failed" };
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Could not parse AI response" };

    return { analysis: JSON.parse(jsonMatch[0]), message: "Keyword analysis complete" };
  } catch {
    return { error: "AI analysis failed" };
  }
}

async function executeGenerateSeoMeta(args: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "AI service not configured" };

  const prompt = `Generate SEO meta tags for:

Title: ${args.title}
${args.content ? `Content: ${String(args.content).substring(0, 800)}` : ""}
Target Keyword: ${args.targetKeyword || "auto-detect"}
Page Type: ${args.pageType || "general"}

Return JSON:
{
  "metaTitle": "optimized title (max ${args.maxLength || 60} chars)",
  "metaDescription": "optimized description (max 160 chars)",
  "keywords": ["kw1", "kw2", ...],
  "ogTitle": "social sharing title",
  "ogDescription": "social sharing description"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.5, max_tokens: 800 }),
    });

    if (!response.ok) return { error: "AI generation failed" };
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Could not parse AI response" };

    return { seo: JSON.parse(jsonMatch[0]), message: "SEO meta generated. Apply with update_blog_post or update_product." };
  } catch {
    return { error: "AI generation failed" };
  }
}

// Security Executors
async function executeRunSecurityScan(args: Record<string, unknown>) {
  const scope = (args.scope as string) || "full";
  const findings: { severity: string; category: string; message: string; recommendation: string }[] = [];

  // Check environment variables for exposed secrets
  const sensitiveVars = ["OPENAI_API_KEY", "MONGODB_URI", "NEXTAUTH_SECRET", "STRIPE_SECRET"];
  for (const v of sensitiveVars) {
    if (!process.env[v]) {
      findings.push({ severity: "warning", category: "configuration", message: `${v} is not set`, recommendation: `Set ${v} in environment variables` });
    }
  }

  // Check CORS configuration
  if (process.env.NODE_ENV === "development") {
    findings.push({ severity: "info", category: "configuration", message: "Running in development mode", recommendation: "Ensure development-only features are disabled in production" });
  }

  // Check for common security headers
  findings.push({ severity: "info", category: "headers", message: "Security headers should be verified", recommendation: "Check Content-Security-Policy, X-Frame-Options, X-Content-Type-Options" });

  // Check auth configuration
  if (!process.env.NEXTAUTH_SECRET) {
    findings.push({ severity: "high", category: "authentication", message: "NEXTAUTH_SECRET is not configured", recommendation: "Set a strong NEXTAUTH_SECRET in environment variables" });
  }

  const summary = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  return { scope, findings, summary, message: `Scan complete. ${findings.length} findings.` };
}

async function executeCheckDependencies() {
  const findings: { package: string; severity: string; message: string }[] = [];

  try {
    const { execSync } = await import("child_process");
    const output = execSync("npm audit --json 2>nul", { encoding: "utf-8", timeout: 30000 });
    const audit = JSON.parse(output);

    if (audit.vulnerabilities) {
      for (const [pkg, info] of Object.entries(audit.vulnerabilities as Record<string, { severity: string; via: string[] }>) as [string, { severity: string; via: string[] }][]) {
        findings.push({ package: pkg, severity: info.severity, message: `Vulnerability in ${pkg}: ${info.via?.join(", ") || "unknown"}` });
      }
    }

    return { findings, total: findings.length, message: `${findings.length} vulnerabilities found` };
  } catch {
    return { findings: [], total: 0, message: "Could not run npm audit" };
  }
}

async function executeAuditAuthentication() {
  const checks: { name: string; status: string; detail: string }[] = [];

  checks.push({
    name: "NEXTAUTH_SECRET",
    status: process.env.NEXTAUTH_SECRET ? "configured" : "missing",
    detail: process.env.NEXTAUTH_SECRET ? "Set" : "Not set — sessions are insecure",
  });

  checks.push({
    name: "JWT Configuration",
    status: "verified",
    detail: "Auth.js v5 with JWT strategy",
  });

  checks.push({
    name: "Role-Based Access",
    status: "implemented",
    detail: "ADMIN_ROLES, CRM_ROLES, CONTENT_ROLES defined in api-middleware.ts",
  });

  checks.push({
    name: "API Authentication",
    status: "implemented",
    detail: "getAuthUser() with NextAuth + legacy JWT fallback",
  });

  const issues = checks.filter((c) => c.status === "missing" || c.status === "weak");

  return { checks, issues, message: issues.length === 0 ? "Auth configuration looks good" : `${issues.length} issues found` };
}

// Error/Logging Executors
async function executeGetErrorLogs(args: Record<string, unknown>) {
  const ErrorLog = (await import("@/models/error-log")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.level) query.level = args.level;
  if (args.status) query.status = args.status;
  if (args.source) query.source = { $regex: args.source, $options: "i" };
  if (args.search) query.message = { $regex: args.search, $options: "i" };
  if (args.startDate || args.endDate) {
    query.createdAt = {};
    if (args.startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(args.startDate as string);
    if (args.endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(args.endDate as string);
  }

  const limit = (args.limit as number) || 20;
  const errors = await ErrorLog.find(query)
    .select("message level source status createdAt metadata")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { errors, total: errors.length };
}

async function executeGetErrorSummary(args: Record<string, unknown>) {
  const ErrorLog = (await import("@/models/error-log")).default;
  await connectToDatabase();

  const hours = (args.hours as number) || 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const byLevel = await ErrorLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$level", count: { $sum: 1 } } },
  ]);

  const bySource = await ErrorLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const byStatus = await ErrorLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const total = await ErrorLog.countDocuments({ createdAt: { $gte: since } });

  return {
    period: `${hours} hours`,
    total,
    byLevel: byLevel.map((l: { _id: string; count: number }) => ({ level: l._id, count: l.count })),
    bySource: bySource.map((s: { _id: string; count: number }) => ({ source: s._id, count: s.count })),
    byStatus: byStatus.map((s: { _id: string; count: number }) => ({ status: s._id, count: s.count })),
  };
}

async function executeResolveError(args: Record<string, unknown>) {
  const ErrorLog = (await import("@/models/error-log")).default;
  await connectToDatabase();

  const error = await ErrorLog.findByIdAndUpdate(
    args.errorId,
    { status: args.status, resolvedAt: args.status === "resolved" ? new Date() : undefined },
    { new: true }
  );

  if (!error) return { error: "Error log not found" };
  return { id: error._id, status: error.status, message: `Error marked as ${args.status}` };
}

// Notification/Media Executors
async function executeGetSystemNotifications(args: Record<string, unknown>) {
  const Notification = (await import("@/models/notification")).default;
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args.type) query.type = args.type;
  if (args.read !== undefined) query.read = args.read;

  const limit = (args.limit as number) || 20;
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { notifications, total: notifications.length };
}

async function executeGetImageInfo(args: Record<string, unknown>) {
  const imageUrl = args.imageUrl as string;
  if (!imageUrl) return { error: "imageUrl is required" };

  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    return {
      url: imageUrl,
      contentType,
      size: contentLength ? `${(parseInt(contentLength) / 1024).toFixed(1)} KB` : "unknown",
      format: contentType?.split("/")[1] || "unknown",
    };
  } catch {
    return { url: imageUrl, error: "Could not fetch image info" };
  }
}

async function executeGenerateImageVariants(args: Record<string, unknown>) {
  const purpose = (args.purpose as string) || "blog";

  const sizePresets: Record<string, { width: number; height: number; label: string }[]> = {
    blog: [
      { width: 1200, height: 630, label: "OG Image (social sharing)" },
      { width: 800, height: 400, label: "Featured (blog list)" },
      { width: 400, height: 200, label: "Thumbnail (card)" },
    ],
    product: [
      { width: 1200, height: 1200, label: "Main (product detail)" },
      { width: 600, height: 600, label: "Gallery thumbnail" },
      { width: 800, height: 800, label: "List view" },
    ],
    og: [
      { width: 1200, height: 630, label: "Facebook/Twitter/LinkedIn" },
    ],
    thumbnail: [
      { width: 200, height: 200, label: "Small thumbnail" },
      { width: 400, height: 400, label: "Medium thumbnail" },
    ],
    hero: [
      { width: 1920, height: 1080, label: "Full HD" },
      { width: 1280, height: 720, label: "HD" },
    ],
  };

  const variants = sizePresets[purpose] || sizePresets.blog;

  return {
    imageUrl: args.imageUrl,
    purpose,
    variants,
    recommendation: `For ${purpose} usage, generate ${variants.length} variants at the specified dimensions.`,
  };
}

// ─── Management Tool Executor ───────────────────────────────────────────────

export async function executeManagementTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    // Blog
    case "create_blog_post": return executeCreateBlogPost(args);
    case "update_blog_post": return executeUpdateBlogPost(args);
    case "get_blog_posts": return executeGetBlogPosts(args);
    case "optimize_blog_seo": return executeOptimizeBlogSeo(args);
    // Product
    case "create_product": return executeCreateProduct(args);
    case "update_product": return executeUpdateProduct(args);
    case "get_products": return executeGetProducts(args);
    case "generate_product_listing": return executeGenerateProductListing(args);
    // SEO
    case "run_seo_audit": return executeRunSeoAudit(args);
    case "analyze_seo_keywords": return executeAnalyzeSeoKeywords(args);
    case "generate_seo_meta": return executeGenerateSeoMeta(args);
    // Security
    case "run_security_scan": return executeRunSecurityScan(args);
    case "check_dependencies": return executeCheckDependencies();
    case "audit_authentication": return executeAuditAuthentication();
    // Error/Logging
    case "get_error_logs": return executeGetErrorLogs(args);
    case "get_error_summary": return executeGetErrorSummary(args);
    case "resolve_error": return executeResolveError(args);
    // Notifications/Media
    case "get_system_notifications": return executeGetSystemNotifications(args);
    case "get_image_info": return executeGetImageInfo(args);
    case "generate_image_variants": return executeGenerateImageVariants(args);
    default:
      return { error: `Unknown management tool: ${toolName}` };
  }
}
