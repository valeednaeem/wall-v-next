import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import HostingPlan from "@/models/hosting-plan";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";
import type { IContentItem } from "@/models/content-item";
import type { IContentTopic } from "@/models/content-topic";
import type { IContentCampaign } from "@/models/content-campaign";

// ─── Article Generation ──────────────────────────────────────────────────────

export async function generateArticle(
  item: IContentItem,
  topic: IContentTopic,
  campaign: IContentCampaign
): Promise<Partial<IContentItem>> {
  const context = await getWallVContext();

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are an expert content writer for Wall-V, a software agency. Write authoritative, SEO-optimized articles. Return ONLY a JSON object with this structure:
{
  "content": "Full article in markdown format with H2/H3 headings",
  "excerpt": "2-3 sentence summary",
  "seo": {
    "metaTitle": "SEO title (max 60 chars)",
    "metaDescription": "Meta description (max 160 chars)",
    "keywords": ["keyword1", "keyword2"]
  },
  "internalLinks": [{"text": "anchor text", "url": "/path"}],
  "cta": "Call to action text"
}`;

  const userPrompt = `Write a comprehensive article for:

Title: ${topic.title}
Primary Keyword: ${topic.primaryKeyword || topic.title}
Secondary Keywords: ${topic.secondaryKeywords?.join(", ") || "N/A"}
Search Intent: ${topic.searchIntent || "informational"}
Content Type: ${topic.contentType || "guide"}
Target Audience: ${campaign.targetAudience?.join(", ") || "Businesses and developers"}

Wall-V Context: ${context}

Requirements:
- 1500-2500 words
- Use the primary keyword naturally in the first paragraph, H2, and conclusion
- Include 3-5 H2 sections with H3 subsections where appropriate
- Include practical examples relevant to Wall-V's services
- End with a clear CTA related to Wall-V's offerings
- Write in a professional but approachable tone
- Include at least 2 internal link suggestions`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 4096,
  });

  let parsed: {
    content: string;
    excerpt: string;
    seo: { metaTitle: string; metaDescription: string; keywords: string[] };
    internalLinks: Array<{ text: string; url: string }>;
    cta: string;
  };

  try {
    const content = result.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      content: result.content,
      excerpt: topic.description || "",
      seo: {
        metaTitle: topic.title,
        metaDescription: topic.description || "",
        keywords: [topic.primaryKeyword || topic.title, ...(topic.secondaryKeywords || [])],
      },
    };
  }

  return {
    content: parsed.content,
    excerpt: parsed.excerpt,
    seo: parsed.seo,
    internalLinks: parsed.internalLinks || [],
  };
}

// ─── Social Variants ─────────────────────────────────────────────────────────

export async function generateSocialVariants(
  item: IContentItem,
  platforms: string[]
): Promise<Array<{ platform: string; content: string; hashtags: string[] }>> {
  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const platformSpecs: Record<string, string> = {
    linkedin: "Professional insight post, max 1300 characters, thought leadership tone",
    facebook: "Educational post, conversational tone, 40-80 words optimal, include link placeholder",
    instagram: "Caption + hashtags, max 2200 characters, engaging and visual",
    x: "Thread of 2-3 tweets OR single tweet, max 280 chars per tweet, punchy and shareable",
  };

  const activePlatforms = platforms.filter((p) => platformSpecs[p]);
  if (activePlatforms.length === 0) return [];

  const systemPrompt = `You are a social media content specialist for Wall-V. Create platform-specific content. Return ONLY a JSON array:
[
  {
    "platform": "platform-name",
    "content": "The post content",
    "hashtags": ["tag1", "tag2", "tag3"]
  }
]`;

  const userPrompt = `Create social media content for this article:

Title: ${item.title}
Excerpt: ${item.excerpt || ""}
Primary Keywords: ${item.seo?.keywords?.join(", ") || "software agency"}

Platform Requirements:
${activePlatforms.map((p) => `- ${p}: ${platformSpecs[p]}`).join("\n")}

Include 3-5 relevant hashtags per platform. Use Wall-V branding: #WallV #WebDevelopment #SoftwareAgency`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 2048,
  });

  try {
    const content = result.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found");
    }
    const variants = JSON.parse(jsonMatch[0]) as Array<{ platform: string; content: string; hashtags: string[] }>;
    return variants.filter((v) => activePlatforms.includes(v.platform));
  } catch {
    return activePlatforms.map((p) => ({
      platform: p,
      content: item.excerpt || item.title,
      hashtags: ["WallV", "WebDevelopment", "SoftwareAgency"],
    }));
  }
}

// ─── Video Script Generation ─────────────────────────────────────────────────

export async function generateVideoScript(
  item: IContentItem,
  topic: IContentTopic
): Promise<{
  hook: string;
  scenes: Array<{ visual: string; dialogue: string; duration: number }>;
  captions: string;
  thumbnailPrompt: string;
}> {
  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are a short-form video script writer for Wall-V. Create a 30-60 second video script. Return ONLY a JSON object:
{
  "hook": "Opening hook line (3 seconds)",
  "scenes": [
    {"visual": "Visual description", "dialogue": "Spoken text", "duration": 5}
  ],
  "captions": "Full captions text",
  "thumbnailPrompt": "DALL-E/Midjourney prompt for thumbnail"
}`;

  const userPrompt = `Write a short-form video script for:

Title: ${topic.title}
Topic: ${topic.description || ""}
Platform: TikTok/Reels/Shorts (30-60 seconds)
Brand: Wall-V - Software Agency specializing in web dev, hosting, and AI

Requirements:
- Start with a strong hook in first 3 seconds
- 4-6 scenes
- Total duration 30-60 seconds
- End with CTA
- Keep dialogue conversational and punchy`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 2048,
  });

  try {
    const content = result.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found");
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      hook: `Did you know about ${topic.title}?`,
      scenes: [
        { visual: "Presenter speaking to camera", dialogue: `Let me tell you about ${topic.title}`, duration: 5 },
        { visual: "Screen recording or B-roll", dialogue: topic.description || "", duration: 15 },
        { visual: "Presenter with CTA overlay", dialogue: "Visit wall-v.com to learn more", duration: 5 },
      ],
      captions: `Learn about ${topic.title} with Wall-V`,
      thumbnailPrompt: `Professional thumbnail for ${topic.title}, tech aesthetic, Wall-V branding`,
    };
  }
}

// ─── Image Prompt Generation ─────────────────────────────────────────────────

export async function generateImagePrompt(
  item: IContentItem,
  type: string
): Promise<string> {
  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const systemPrompt = `You are an expert at writing image generation prompts for DALL-E/Midjourney. Return ONLY the prompt string, no quotes or explanation.`;

  const typeSpecs: Record<string, string> = {
    hero: "Hero image for a blog article, wide format (1920x1080), professional tech aesthetic",
    social_thumbnail: "Social media thumbnail, square format (1080x1080), eye-catching",
    featured: "Featured image for article, 16:9 ratio, professional",
  };

  const userPrompt = `Create an image generation prompt for:

Article: ${item.title}
Type: ${typeSpecs[type] || "General blog image"}
Style: Professional, modern tech aesthetic, subtle Wall-V branding (dark theme with accent colors)
Content theme: ${item.seo?.keywords?.slice(0, 3).join(", ") || item.title}

Requirements:
- Do not include any text or watermarks in the image
- Use abstract tech visuals (code, circuits, data flows, modern UI elements)
- Color palette: dark backgrounds with blue/purple/cyan accents
- Professional and modern feel`;

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 512,
  });

  return result.content.trim();
}

// ─── Wall-V Context ──────────────────────────────────────────────────────────

export async function getWallVContext(): Promise<string> {
  await connectToDatabase();

  const [products, hostingPlans] = await Promise.all([
    Product.find({ status: "published" })
      .select("name type description shortDescription features price")
      .limit(15)
      .lean(),
    HostingPlan.find({ status: "active" })
      .select("name price features description")
      .limit(10)
      .lean(),
  ]);

  const productLines = products
    .map((p) => `- ${p.name} (${p.type}): ${p.shortDescription || p.description || "N/A"}`)
    .join("\n");

  const hostingLines = hostingPlans
    .map((h) => `- ${h.name}: $${h.price || 0}/mo - ${(h.features || []).slice(0, 3).join(", ")}`)
    .join("\n");

  return `Wall-V is a full-service software agency.
Services: Custom web development, mobile apps, AI/ML solutions, cloud hosting, domain management, SaaS development, UI/UX design, DevOps, maintenance & support.
Products:
${productLines || "- Web development services\n- AI-powered solutions\n- Cloud hosting"}
Hosting Plans:
${hostingLines || "- Starter: $9.99/mo\n- Professional: $29.99/mo\n- Enterprise: $99.99/mo"}
Domain: wall-v.com
Target: Startups, SMBs, and enterprises needing modern web solutions.
Tone: Professional, technical authority, approachable.
Differentiators: AI-first approach, full-stack capability, modern tech stack (Next.js, React, TypeScript, Node.js, MongoDB).`;
}
