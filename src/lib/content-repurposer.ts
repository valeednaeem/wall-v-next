import { connectToDatabase } from "@/lib/mongodb";
import ContentItem from "@/models/content-item";
import BlogPost from "@/models/blog-post";
import type { IContentItem } from "@/models/content-item";
import type { IBlogPost } from "@/models/blog-post";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";
import { generateSlug } from "@/lib/generate-slug";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RepurposeFormat =
  | "twitter_thread"
  | "linkedin_post"
  | "facebook_post"
  | "newsletter"
  | "video_script"
  | "infographic"
  | "email_sequence"
  | "podcast_script";

export interface RepurposeResult {
  sourceItem: IContentItem;
  generatedItems: IContentItem[];
  summary: string;
}

// ─── Format Configurations ───────────────────────────────────────────────────

const FORMAT_CONFIG: Record<
  RepurposeFormat,
  {
    type: IContentItem["type"];
    platform: IContentItem["platform"];
    label: string;
    systemPrompt: string;
    userPromptTemplate: (content: string, title: string, opts?: RepurposeOptions) => string;
  }
> = {
  twitter_thread: {
    type: "social_post",
    platform: "x",
    label: "Twitter/X Thread",
    systemPrompt: `You are a social media expert specializing in Twitter/X threads. Transform content into a compelling 5-10 tweet thread. Return ONLY a JSON object:
{
  "tweets": ["Tweet 1 (hook)", "Tweet 2", ... "Tweet N (CTA)"],
  "hashtags": ["tag1", "tag2", "tag3"]
}
Each tweet must be under 280 characters. Start with a hook, deliver value, end with CTA.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a Twitter/X thread:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 3000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- 5-10 tweets\n- First tweet is a hook\n- Last tweet is a CTA\n- Include 3-5 relevant hashtags\n- Each tweet under 280 chars`,
  },
  linkedin_post: {
    type: "social_post",
    platform: "linkedin",
    label: "LinkedIn Post",
    systemPrompt: `You are a LinkedIn content strategist. Create professional, thought-leadership posts. Return ONLY a JSON object:
{
  "content": "The LinkedIn post (150-300 words)",
  "hashtags": ["tag1", "tag2", "tag3"]
}
Write in first person, use line breaks for readability, include industry insights.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a LinkedIn post:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 3000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- 150-300 words\n- Professional thought-leadership tone\n- Include industry insights\n- End with engagement question\n- 3-5 relevant hashtags`,
  },
  facebook_post: {
    type: "social_post",
    platform: "facebook",
    label: "Facebook Post",
    systemPrompt: `You are a Facebook content creator. Create engaging, conversational posts. Return ONLY a JSON object:
{
  "content": "The Facebook post (100-200 words)",
  "hashtags": ["tag1", "tag2", "tag3"]
}
Write conversationally, use emojis sparingly, include a question to drive engagement.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a Facebook post:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 3000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- 100-200 words\n- Conversational, friendly tone\n- Include a question or call-to-action\n- 2-3 relevant hashtags`,
  },
  newsletter: {
    type: "newsletter",
    platform: "email",
    label: "Newsletter",
    systemPrompt: `You are an email marketing specialist. Create newsletter content. Return ONLY a JSON object:
{
  "subject": "Email subject line (max 60 chars)",
  "previewText": "Preview text (max 100 chars)",
  "body": "Email body in markdown (300-500 words)",
  "cta": "Call to action text",
  "ctaUrl": "/relevant-page"
}
Write engaging, scannable content with clear sections.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a newsletter email:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 4000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- Compelling subject line (max 60 chars)\n- Preview text (max 100 chars)\n- 300-500 word body\n- Clear CTA\n- Scannable format with headers`,
  },
  video_script: {
    type: "video_script",
    platform: "youtube",
    label: "Video Script",
    systemPrompt: `You are a short-form video scriptwriter. Create 30-60 second scripts. Return ONLY a JSON object:
{
  "hook": "Opening hook (3 seconds)",
  "scenes": [
    {"visual": "Visual description", "dialogue": "Spoken text", "duration": 5}
  ],
  "captions": "Full captions text",
  "thumbnailPrompt": "Image generation prompt for thumbnail"
}
Write punchy, conversational dialogue.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a 30-60 second video script:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 3000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- 30-60 seconds total\n- Strong hook in first 3 seconds\n- 4-6 scenes\n- Conversational dialogue\n- End with CTA\n- Include thumbnail prompt`,
  },
  infographic: {
    type: "social_post",
    platform: "blog",
    label: "Infographic",
    systemPrompt: `You are a visual content designer. Create infographic data points. Return ONLY a JSON object:
{
  "title": "Infographic title",
  "sections": [
    {
      "heading": "Section heading",
      "points": ["Point 1", "Point 2", "Point 3"],
      "stat": "Optional statistic or number"
    }
  ],
  "footer": "Footer text or CTA"
}
Extract key data points and statistics.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into infographic data points:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 3000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}Requirements:\n- 4-6 sections\n- Each section has a heading and 2-4 bullet points\n- Include statistics/numbers where possible\n- Clear visual hierarchy\n- Conclude with CTA`,
  },
  email_sequence: {
    type: "newsletter",
    platform: "email",
    label: "Email Sequence",
    systemPrompt: `You are an email nurture sequence specialist. Create a 3-email sequence. Return ONLY a JSON object:
{
  "emails": [
    {
      "subject": "Email subject",
      "previewText": "Preview text",
      "body": "Email body in markdown",
      "cta": "CTA text",
      "sendDelay": "1 day"
    }
  ]
}
Email 1: Hook + key insight
Email 2: Deeper dive + practical tips
Email 3: CTA + related content`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a 3-email nurture sequence:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 4000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- Email 1: Hook + key insight (send immediately)\n- Email 2: Deeper dive + practical tips (send day 2)\n- Email 3: CTA + related content (send day 4)\n- Each email 200-400 words\n- Compelling subject lines\n- Clear CTAs`,
  },
  podcast_script: {
    type: "video_script",
    platform: "youtube",
    label: "Podcast Script",
    systemPrompt: `You are a podcast scriptwriter. Create 2-3 minute audio scripts. Return ONLY a JSON object:
{
  "title": "Episode title",
  "intro": "Intro script (15-20 seconds)",
  "segments": [
    {
      "heading": "Segment heading",
      "content": "Segment content (30-60 seconds)",
      "transition": "Transition line"
    }
  ],
  "outro": "Outro script with CTA (15-20 seconds)"
}
Write in conversational, spoken-word style.`,
    userPromptTemplate: (content, title, opts) =>
      `Transform this content into a 2-3 minute podcast script:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 3000)}\n\n${opts?.brandVoice ? `Brand voice: ${opts.brandVoice}\n` : ""}${opts?.targetAudience ? `Target audience: ${opts.targetAudience}\n` : ""}Requirements:\n- 2-3 minutes total\n- Conversational spoken-word style\n- Intro with hook (15-20 sec)\n- 3-4 content segments\n- Outro with CTA (15-20 sec)\n- Natural transitions`,
  },
};

interface RepurposeOptions {
  brandVoice?: string;
  targetAudience?: string;
}

// ─── Core Repurposing Engine ─────────────────────────────────────────────────

export async function repurposeContent(
  contentItemId: string,
  formats: RepurposeFormat[],
  options?: RepurposeOptions
): Promise<RepurposeResult> {
  await connectToDatabase();

  const sourceItem = await ContentItem.findById(contentItemId).lean() as unknown as IContentItem | null;
  if (!sourceItem) {
    throw new Error("Source content item not found");
  }

  if (!sourceItem.content) {
    throw new Error("Source content item has no content to repurpose");
  }

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const generatedItems: IContentItem[] = [];

  for (const format of formats) {
    const config = FORMAT_CONFIG[format];
    if (!config) continue;

    try {
      const result = await adapter.chat({
        model,
        messages: [
          { role: "system", content: config.systemPrompt },
          {
            role: "user",
            content: config.userPromptTemplate(
              sourceItem.content,
              sourceItem.title,
              options
            ),
          },
        ],
        temperature: 0.7,
        maxTokens: 2048,
      });

      const parsed = parseAIResponse(result.content, format);
      const generatedContent = formatGeneratedContent(format, parsed);

      const newItem = await ContentItem.create({
        campaign: sourceItem.campaign,
        type: config.type,
        platform: config.platform,
        title: `${sourceItem.title} — ${config.label}`,
        slug: generateSlug(`${sourceItem.title}-${format}`),
        content: generatedContent,
        status: "draft",
        approvalRequired: true,
        repurposeMetadata: {
          sourceItemId: sourceItem._id,
          sourceType: getSourceType(sourceItem.type),
          repurposedFrom: format,
          generatedAt: new Date(),
        },
      });

      generatedItems.push(newItem as unknown as IContentItem);
    } catch (err) {
      console.error(`[Repurposer] Failed to generate ${format}:`, err);
    }
  }

  return {
    sourceItem: sourceItem as unknown as IContentItem,
    generatedItems,
    summary: `Generated ${generatedItems.length} of ${formats.length} requested formats from "${sourceItem.title}"`,
  };
}

// ─── Blog to Social Thread ───────────────────────────────────────────────────

export async function blogToSocialThread(blogPostId: string): Promise<IContentItem[]> {
  await connectToDatabase();

  const blogPost = await BlogPost.findById(blogPostId).lean() as unknown as IBlogPost | null;
  if (!blogPost) {
    throw new Error("Blog post not found");
  }

  if (blogPost.status !== "published") {
    throw new Error("Blog post must be published to repurpose");
  }

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);
  const generated: IContentItem[] = [];

  // Generate Twitter thread
  const twitterResult = await adapter.chat({
    model,
    messages: [
      { role: "system", content: FORMAT_CONFIG.twitter_thread.systemPrompt },
      {
        role: "user",
        content: FORMAT_CONFIG.twitter_thread.userPromptTemplate(
          blogPost.content,
          blogPost.title
        ),
      },
    ],
    temperature: 0.7,
    maxTokens: 2048,
  });

  const twitterParsed = parseAIResponse(twitterResult.content, "twitter_thread");
  const twitterContent = formatGeneratedContent("twitter_thread", twitterParsed);

  const twitterItem = await ContentItem.create({
    campaign: blogPost._id,
    type: "social_post",
    platform: "x",
    title: `${blogPost.title} — Twitter Thread`,
    slug: generateSlug(`${blogPost.title}-twitter-thread`),
    content: twitterContent,
    status: "draft",
    approvalRequired: true,
    relatedBlogPost: blogPost._id,
    repurposeMetadata: {
      sourceType: "blog_post",
      repurposedFrom: "twitter_thread",
      generatedAt: new Date(),
    },
  });
  generated.push(twitterItem);

  // Generate LinkedIn post
  const linkedinResult = await adapter.chat({
    model,
    messages: [
      { role: "system", content: FORMAT_CONFIG.linkedin_post.systemPrompt },
      {
        role: "user",
        content: FORMAT_CONFIG.linkedin_post.userPromptTemplate(
          blogPost.content,
          blogPost.title
        ),
      },
    ],
    temperature: 0.7,
    maxTokens: 2048,
  });

  const linkedinParsed = parseAIResponse(linkedinResult.content, "linkedin_post");
  const linkedinContent = formatGeneratedContent("linkedin_post", linkedinParsed);

  const linkedinItem = await ContentItem.create({
    campaign: blogPost._id,
    type: "social_post",
    platform: "linkedin",
    title: `${blogPost.title} — LinkedIn Post`,
    slug: generateSlug(`${blogPost.title}-linkedin`),
    content: linkedinContent,
    status: "draft",
    approvalRequired: true,
    relatedBlogPost: blogPost._id,
    repurposeMetadata: {
      sourceType: "blog_post",
      repurposedFrom: "linkedin_post",
      generatedAt: new Date(),
    },
  });
  generated.push(linkedinItem);

  // Generate Facebook post
  const facebookResult = await adapter.chat({
    model,
    messages: [
      { role: "system", content: FORMAT_CONFIG.facebook_post.systemPrompt },
      {
        role: "user",
        content: FORMAT_CONFIG.facebook_post.userPromptTemplate(
          blogPost.content,
          blogPost.title
        ),
      },
    ],
    temperature: 0.7,
    maxTokens: 2048,
  });

  const facebookParsed = parseAIResponse(facebookResult.content, "facebook_post");
  const facebookContent = formatGeneratedContent("facebook_post", facebookParsed);

  const facebookItem = await ContentItem.create({
    campaign: blogPost._id,
    type: "social_post",
    platform: "facebook",
    title: `${blogPost.title} — Facebook Post`,
    slug: generateSlug(`${blogPost.title}-facebook`),
    content: facebookContent,
    status: "draft",
    approvalRequired: true,
    relatedBlogPost: blogPost._id,
    repurposeMetadata: {
      sourceType: "blog_post",
      repurposedFrom: "facebook_post",
      generatedAt: new Date(),
    },
  });
  generated.push(facebookItem);

  return generated;
}

// ─── Content to Email Sequence ───────────────────────────────────────────────

export async function contentToEmailSequence(contentItemId: string): Promise<IContentItem[]> {
  await connectToDatabase();

  const sourceItem = await ContentItem.findById(contentItemId).lean() as unknown as IContentItem | null;
  if (!sourceItem) {
    throw new Error("Source content item not found");
  }

  if (!sourceItem.content) {
    throw new Error("Source content item has no content");
  }

  const model = process.env.AI_CONTENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const adapter = getProviderAdapter(model);

  const result = await adapter.chat({
    model,
    messages: [
      { role: "system", content: FORMAT_CONFIG.email_sequence.systemPrompt },
      {
        role: "user",
        content: FORMAT_CONFIG.email_sequence.userPromptTemplate(
          sourceItem.content,
          sourceItem.title
        ),
      },
    ],
    temperature: 0.7,
    maxTokens: 3000,
  });

  const parsed = parseAIResponse(result.content, "email_sequence");
  const emails = (parsed as Record<string, unknown>).emails as Array<{
    subject: string;
    previewText: string;
    body: string;
    cta: string;
    sendDelay: string;
  }> | undefined;

  const generated: IContentItem[] = [];

  if (emails && Array.isArray(emails)) {
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const emailContent = [
        `# ${email.subject}`,
        "",
        `**Preview:** ${email.previewText}`,
        "",
        "---",
        "",
        email.body,
        "",
        "---",
        "",
        `**CTA:** ${email.cta}`,
      ].join("\n");

      const item = await ContentItem.create({
        campaign: sourceItem.campaign,
        type: "newsletter",
        platform: "email",
        title: `${sourceItem.title} — Email ${i + 1}: ${email.subject}`,
        slug: generateSlug(`${sourceItem.title}-email-${i + 1}`),
        content: emailContent,
        status: "draft",
        approvalRequired: true,
        repurposeMetadata: {
          sourceItemId: sourceItem._id,
          sourceType: getSourceType(sourceItem.type),
          repurposedFrom: "email_sequence",
          generatedAt: new Date(),
        },
      });
      generated.push(item);
    }
  }

  return generated;
}

// ─── Batch Repurpose ─────────────────────────────────────────────────────────

export async function batchRepurpose(
  campaignId: string,
  formats: RepurposeFormat[]
): Promise<RepurposeResult[]> {
  await connectToDatabase();

  const items = await ContentItem.find({
    campaign: campaignId,
    status: { $in: ["published", "approved"] },
  }).lean();

  const results: RepurposeResult[] = [];

  for (const item of items) {
    try {
      const result = await repurposeContent(
        (item as unknown as IContentItem)._id.toString(),
        formats
      );
      results.push(result);
    } catch (err) {
      console.error(`[BatchRepurpose] Failed for item ${item._id}:`, err);
    }
  }

  return results;
}

// ─── Repurpose History ───────────────────────────────────────────────────────

export async function getRepurposeHistory(contentItemId: string): Promise<IContentItem[]> {
  await connectToDatabase();

  const items = await ContentItem.find({
    "repurposeMetadata.sourceItemId": contentItemId,
  })
    .sort({ createdAt: -1 })
    .lean();

  return items as unknown as IContentItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAIResponse(
  raw: string,
  format: RepurposeFormat
): Record<string, unknown> {
  try {
    const content = raw.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    return generateFallbackContent(format, raw);
  }
}

function generateFallbackContent(
  format: RepurposeFormat,
  rawContent: string
): Record<string, unknown> {
  const fallback = rawContent.slice(0, 500) || "Content repurposed from source material.";

  switch (format) {
    case "twitter_thread":
      return {
        tweets: [fallback.slice(0, 270)],
        hashtags: ["WallV", "WebDevelopment"],
      };
    case "linkedin_post":
    case "facebook_post":
      return {
        content: fallback,
        hashtags: ["WallV", "WebDevelopment"],
      };
    case "newsletter":
      return {
        subject: "Insights from Wall-V",
        previewText: "Fresh insights for your business",
        body: fallback,
        cta: "Learn more at wall-v.com",
        ctaUrl: "/",
      };
    case "video_script":
      return {
        hook: "Did you know?",
        scenes: [
          { visual: "Presenter", dialogue: fallback.slice(0, 150), duration: 10 },
        ],
        captions: fallback,
        thumbnailPrompt: "Professional tech thumbnail with Wall-V branding",
      };
    case "infographic":
      return {
        title: "Key Insights",
        sections: [
          { heading: "Overview", points: [fallback.slice(0, 200)] },
        ],
        footer: "Learn more at wall-v.com",
      };
    case "email_sequence":
      return {
        emails: [
          {
            subject: "Important Insights",
            previewText: "Don't miss these insights",
            body: fallback,
            cta: "Learn more",
            sendDelay: "0 days",
          },
        ],
      };
    case "podcast_script":
      return {
        title: "Episode Insights",
        intro: "Welcome to this episode.",
        segments: [
          { heading: "Main Topic", content: fallback.slice(0, 300), transition: "Moving on..." },
        ],
        outro: "Thanks for listening. Visit wall-v.com to learn more.",
      };
    default:
      return { content: fallback };
  }
}

function formatGeneratedContent(
  format: RepurposeFormat,
  parsed: Record<string, unknown>
): string {
  switch (format) {
    case "twitter_thread": {
      const tweets = parsed.tweets as string[] | undefined;
      if (!tweets) return JSON.stringify(parsed);
      return tweets.map((t, i) => `**${i + 1}/${tweets.length}** ${t}`).join("\n\n");
    }
    case "linkedin_post":
    case "facebook_post":
      return (parsed.content as string) || JSON.stringify(parsed);
    case "newsletter": {
      const parts = [
        `# ${parsed.subject || "Newsletter"}`,
        "",
        `**Preview:** ${parsed.previewText || ""}`,
        "",
        "---",
        "",
        parsed.body || "",
        "",
        "---",
        "",
        `**CTA:** ${parsed.cta || ""}`,
      ];
      return parts.join("\n");
    }
    case "video_script": {
      const scenes = (parsed.scenes as Array<{ visual: string; dialogue: string; duration: number }>) || [];
      const parts = [
        `# Video Script`,
        "",
        `**Hook:** ${parsed.hook || ""}`,
        "",
        "## Scenes",
        "",
        ...scenes.map(
          (s, i) =>
            `### Scene ${i + 1} (${s.duration}s)\n**Visual:** ${s.visual}\n**Dialogue:** ${s.dialogue}`
        ),
        "",
        `**Captions:** ${parsed.captions || ""}`,
        "",
        `**Thumbnail Prompt:** ${parsed.thumbnailPrompt || ""}`,
      ];
      return parts.join("\n");
    }
    case "infographic": {
      const sections = (parsed.sections as Array<{ heading: string; points: string[]; stat?: string }>) || [];
      const parts = [
        `# ${parsed.title || "Infographic"}`,
        "",
        ...sections.map(
          (s) =>
            `## ${s.heading}${s.stat ? ` — ${s.stat}` : ""}\n${s.points.map((p) => `- ${p}`).join("\n")}`
        ),
        "",
        parsed.footer || "",
      ];
      return parts.join("\n");
    }
    case "email_sequence": {
      const emails = (parsed.emails as Array<{ subject: string; body: string; cta: string }>) || [];
      return emails
        .map(
          (e, i) =>
            `## Email ${i + 1}: ${e.subject}\n\n${e.body}\n\n**CTA:** ${e.cta}`
        )
        .join("\n\n---\n\n");
    }
    case "podcast_script": {
      const segments = (parsed.segments as Array<{ heading: string; content: string; transition: string }>) || [];
      const parts = [
        `# ${parsed.title || "Podcast Script"}`,
        "",
        `## Intro\n${parsed.intro || ""}`,
        "",
        ...segments.map(
          (s) => `## ${s.heading}\n${s.content}\n\n*${s.transition}*`
        ),
        "",
        `## Outro\n${parsed.outro || ""}`,
      ];
      return parts.join("\n");
    }
    default:
      return JSON.stringify(parsed);
  }
}

function getSourceType(
  type: IContentItem["type"]
): "blog_post" | "social_post" | "video_script" | "email_sequence" {
  switch (type) {
    case "article":
      return "blog_post";
    case "social_post":
      return "social_post";
    case "video_script":
      return "video_script";
    case "newsletter":
      return "email_sequence";
    default:
      return "blog_post";
  }
}
