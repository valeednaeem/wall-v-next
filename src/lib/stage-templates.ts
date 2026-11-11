// Dynamic stage generation based on project type
// Each project type gets appropriate stages with relevant tasks

interface StageTemplate {
  name: string;
  description: string;
  type: string;
  estimatedDays: number;
  tasks: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    estimatedHours: number;
  }[];
  acceptanceCriteria: string[];
}

const STAGE_TEMPLATES: Record<string, StageTemplate[]> = {
  "web-development": [
    {
      name: "Discovery & Requirements",
      description: "Gather and document all project requirements, identify stakeholders, and define project scope",
      type: "discovery",
      estimatedDays: 5,
      tasks: [
        { title: "Review client requirements document", description: "Analyze the initial requirements provided by the client", priority: "high", estimatedHours: 4 },
        { title: "Identify target users and personas", description: "Define the primary and secondary user groups", priority: "high", estimatedHours: 3 },
        { title: "Map required features and functionality", description: "Create a comprehensive feature list with priorities", priority: "high", estimatedHours: 6 },
        { title: "Identify third-party integrations", description: "List all external services and APIs needed", priority: "medium", estimatedHours: 3 },
        { title: "Define technical requirements", description: "Specify hosting, performance, and compatibility needs", priority: "medium", estimatedHours: 4 },
        { title: "Identify content requirements", description: "Determine content types, volumes, and sources", priority: "medium", estimatedHours: 3 },
        { title: "Identify design requirements", description: "Understand brand guidelines and design preferences", priority: "medium", estimatedHours: 2 },
        { title: "Identify hosting and domain requirements", description: "Determine infrastructure needs", priority: "low", estimatedHours: 2 },
        { title: "Document unanswered questions", description: "Compile a list of clarifications needed from the client", priority: "high", estimatedHours: 2 },
        { title: "Prepare requirements specification", description: "Create a formal requirements document", priority: "high", estimatedHours: 6 },
      ],
      acceptanceCriteria: [
        "Requirements document completed and reviewed",
        "All stakeholder questions resolved",
        "Feature list prioritized and agreed upon",
        "Technical requirements documented",
      ],
    },
    {
      name: "Planning & Architecture",
      description: "Define project architecture, technology stack, and development approach",
      type: "planning",
      estimatedDays: 3,
      tasks: [
        { title: "Define technology stack", description: "Select frameworks, libraries, and tools", priority: "high", estimatedHours: 4 },
        { title: "Create system architecture", description: "Design the technical architecture and data flow", priority: "high", estimatedHours: 6 },
        { title: "Plan database schema", description: "Design the data model", priority: "high", estimatedHours: 4 },
        { title: "Define API structure", description: "Plan endpoints and data contracts", priority: "medium", estimatedHours: 4 },
        { title: "Create development timeline", description: "Break down work into sprints or phases", priority: "high", estimatedHours: 3 },
        { title: "Set up development environment", description: "Configure repos, CI/CD, and tools", priority: "medium", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "Architecture document approved",
        "Technology stack confirmed",
        "Development timeline agreed",
        "Development environment ready",
      ],
    },
    {
      name: "Design",
      description: "Create UI/UX designs, wireframes, and visual mockups",
      type: "design",
      estimatedDays: 7,
      tasks: [
        { title: "Create wireframes", description: "Design low-fidelity wireframes for all pages", priority: "high", estimatedHours: 8 },
        { title: "Design UI mockups", description: "Create high-fidelity visual designs", priority: "high", estimatedHours: 12 },
        { title: "Create design system", description: "Define colors, typography, components", priority: "high", estimatedHours: 6 },
        { title: "Design responsive layouts", description: "Ensure mobile and tablet compatibility", priority: "high", estimatedHours: 6 },
        { title: "Client design review", description: "Present designs for client approval", priority: "high", estimatedHours: 2 },
      ],
      acceptanceCriteria: [
        "All page designs completed",
        "Design system documented",
        "Client approval received",
        "Responsive designs verified",
      ],
    },
    {
      name: "Development",
      description: "Implement the frontend and backend according to specifications",
      type: "development",
      estimatedDays: 14,
      tasks: [
        { title: "Set up project structure", description: "Initialize the codebase and folder structure", priority: "high", estimatedHours: 4 },
        { title: "Implement database models", description: "Create all database schemas and migrations", priority: "high", estimatedHours: 6 },
        { title: "Build backend APIs", description: "Implement all server-side endpoints", priority: "high", estimatedHours: 20 },
        { title: "Build frontend pages", description: "Implement all UI components and pages", priority: "high", estimatedHours: 24 },
        { title: "Implement authentication", description: "Set up user auth and authorization", priority: "high", estimatedHours: 6 },
        { title: "Integrate frontend with backend", description: "Connect UI to API endpoints", priority: "high", estimatedHours: 8 },
        { title: "Implement third-party integrations", description: "Connect external services", priority: "medium", estimatedHours: 8 },
      ],
      acceptanceCriteria: [
        "All features implemented",
        "Code review completed",
        "Unit tests passing",
        "Integration tests passing",
      ],
    },
    {
      name: "Testing & QA",
      description: "Comprehensive testing to ensure quality and performance",
      type: "testing",
      estimatedDays: 5,
      tasks: [
        { title: "Functional testing", description: "Test all features against requirements", priority: "high", estimatedHours: 8 },
        { title: "Cross-browser testing", description: "Test on Chrome, Firefox, Safari, Edge", priority: "high", estimatedHours: 4 },
        { title: "Mobile responsiveness testing", description: "Test on various device sizes", priority: "high", estimatedHours: 4 },
        { title: "Performance testing", description: "Load testing and optimization", priority: "medium", estimatedHours: 4 },
        { title: "Security testing", description: "Identify and fix vulnerabilities", priority: "high", estimatedHours: 4 },
        { title: "User acceptance testing", description: "Client testing and feedback", priority: "high", estimatedHours: 4 },
      ],
      acceptanceCriteria: [
        "All test cases passed",
        "No critical bugs remaining",
        "Performance benchmarks met",
        "Client UAT approved",
      ],
    },
    {
      name: "Deployment",
      description: "Deploy the project to production and verify",
      type: "deployment",
      estimatedDays: 2,
      tasks: [
        { title: "Prepare production environment", description: "Configure servers, domains, SSL", priority: "high", estimatedHours: 4 },
        { title: "Deploy application", description: "Push code to production", priority: "high", estimatedHours: 4 },
        { title: "Configure DNS and domains", description: "Set up domain routing", priority: "high", estimatedHours: 2 },
        { title: "Verify deployment", description: "Smoke test production", priority: "high", estimatedHours: 2 },
        { title: "Handover documentation", description: "Provide admin guides and credentials", priority: "medium", estimatedHours: 4 },
      ],
      acceptanceCriteria: [
        "Application live on production",
        "All features verified in production",
        "Documentation delivered",
        "Client sign-off received",
      ],
    },
  ],
  "seo": [
    {
      name: "SEO Discovery & Audit",
      description: "Analyze current state and identify opportunities",
      type: "discovery",
      estimatedDays: 3,
      tasks: [
        { title: "Website technical audit", description: "Analyze site speed, mobile-friendliness, crawlability", priority: "high", estimatedHours: 4 },
        { title: "Keyword research", description: "Identify target keywords and search volume", priority: "high", estimatedHours: 6 },
        { title: "Competitor analysis", description: "Analyze competitor SEO strategies", priority: "high", estimatedHours: 4 },
        { title: "Current ranking analysis", description: "Document current search positions", priority: "medium", estimatedHours: 3 },
        { title: "Content audit", description: "Evaluate existing content quality", priority: "medium", estimatedHours: 4 },
        { title: "Backlink profile analysis", description: "Review existing backlinks", priority: "medium", estimatedHours: 3 },
        { title: "Prepare SEO strategy", description: "Create comprehensive SEO plan", priority: "high", estimatedHours: 6 },
      ],
      acceptanceCriteria: [
        "Technical audit completed",
        "Keyword strategy defined",
        "Competitor benchmarks established",
        "SEO strategy approved",
      ],
    },
    {
      name: "Technical SEO",
      description: "Fix technical issues and optimize site structure",
      type: "development",
      estimatedDays: 5,
      tasks: [
        { title: "Fix crawl errors", description: "Resolve 404s, redirects, and crawl issues", priority: "high", estimatedHours: 4 },
        { title: "Optimize site speed", description: "Improve Core Web Vitals", priority: "high", estimatedHours: 6 },
        { title: "Implement schema markup", description: "Add structured data", priority: "medium", estimatedHours: 4 },
        { title: "Optimize robots.txt and sitemap", description: "Configure crawl directives", priority: "medium", estimatedHours: 2 },
        { title: "Fix mobile issues", description: "Resolve mobile usability problems", priority: "high", estimatedHours: 4 },
      ],
      acceptanceCriteria: [
        "All crawl errors resolved",
        "Core Web Vitals improved",
        "Schema markup implemented",
      ],
    },
    {
      name: "On-Page SEO",
      description: "Optimize page content and metadata",
      type: "development",
      estimatedDays: 5,
      tasks: [
        { title: "Optimize title tags and meta descriptions", description: "Write optimized metadata for all pages", priority: "high", estimatedHours: 6 },
        { title: "Optimize heading structure", description: "Ensure proper H1-H6 hierarchy", priority: "medium", estimatedHours: 3 },
        { title: "Optimize image alt tags", description: "Add descriptive alt text", priority: "medium", estimatedHours: 3 },
        { title: "Internal linking optimization", description: "Improve page linking structure", priority: "medium", estimatedHours: 4 },
        { title: "Content optimization", description: "Optimize content for target keywords", priority: "high", estimatedHours: 8 },
      ],
      acceptanceCriteria: [
        "All pages optimized",
        "Content quality improved",
        "Internal linking enhanced",
      ],
    },
  ],
  "graphic-design": [
    {
      name: "Creative Discovery",
      description: "Understand the brand, audience, and creative direction",
      type: "discovery",
      estimatedDays: 2,
      tasks: [
        { title: "Understand brand identity", description: "Review brand guidelines and values", priority: "high", estimatedHours: 3 },
        { title: "Identify target audience", description: "Define who the design is for", priority: "high", estimatedHours: 2 },
        { title: "Collect design references", description: "Gather inspiration and examples", priority: "medium", estimatedHours: 3 },
        { title: "Determine design style", description: "Establish visual direction", priority: "high", estimatedHours: 2 },
        { title: "Define deliverables", description: "List all required design outputs", priority: "high", estimatedHours: 2 },
        { title: "Prepare creative brief", description: "Document creative direction", priority: "high", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "Creative brief approved",
        "Design direction confirmed",
        "Deliverables list finalized",
      ],
    },
    {
      name: "Concept Design",
      description: "Create initial design concepts for review",
      type: "design",
      estimatedDays: 5,
      tasks: [
        { title: "Create initial concepts", description: "Develop 2-3 design directions", priority: "high", estimatedHours: 12 },
        { title: "Present concepts to client", description: "Showcase design options", priority: "high", estimatedHours: 2 },
        { title: "Gather client feedback", description: "Collect and analyze feedback", priority: "high", estimatedHours: 2 },
        { title: "Refine chosen concept", description: "Iterate based on feedback", priority: "high", estimatedHours: 8 },
      ],
      acceptanceCriteria: [
        "Concept presented to client",
        "Client direction selected",
        "Refinement completed",
      ],
    },
    {
      name: "Final Design",
      description: "Complete the final design deliverables",
      type: "design",
      estimatedDays: 3,
      tasks: [
        { title: "Finalize design files", description: "Complete all design deliverables", priority: "high", estimatedHours: 8 },
        { title: "Prepare file exports", description: "Export in required formats", priority: "medium", estimatedHours: 3 },
        { title: "Create style guide", description: "Document colors, fonts, and usage", priority: "medium", estimatedHours: 3 },
        { title: "Final client review", description: "Present final deliverables", priority: "high", estimatedHours: 2 },
      ],
      acceptanceCriteria: [
        "All deliverables completed",
        "Client approval received",
        "Files delivered",
      ],
    },
  ],
  "logo-design": [
    {
      name: "Creative Discovery",
      description: "Understand the brand and design direction",
      type: "discovery",
      estimatedDays: 2,
      tasks: [
        { title: "Understand brand values", description: "Learn about the company's mission and personality", priority: "high", estimatedHours: 2 },
        { title: "Collect logo references", description: "Gather inspiration and examples", priority: "medium", estimatedHours: 2 },
        { title: "Determine color preferences", description: "Discuss color direction", priority: "medium", estimatedHours: 1 },
        { title: "Determine typography style", description: "Discuss font preferences", priority: "medium", estimatedHours: 1 },
        { title: "Define deliverables", description: "List required file formats and variations", priority: "high", estimatedHours: 1 },
      ],
      acceptanceCriteria: [
        "Creative brief approved",
        "Design direction confirmed",
      ],
    },
    {
      name: "Concept Design",
      description: "Create initial logo concepts",
      type: "design",
      estimatedDays: 3,
      tasks: [
        { title: "Sketch initial concepts", description: "Create 3-4 logo directions", priority: "high", estimatedHours: 6 },
        { title: "Digitize concepts", description: "Create vector versions", priority: "high", estimatedHours: 6 },
        { title: "Present concepts", description: "Showcase logo options", priority: "high", estimatedHours: 2 },
        { title: "Refine chosen concept", description: "Iterate based on feedback", priority: "high", estimatedHours: 4 },
      ],
      acceptanceCriteria: [
        "Concepts presented",
        "Client direction selected",
      ],
    },
    {
      name: "Final Design",
      description: "Complete final logo deliverables",
      type: "design",
      estimatedDays: 2,
      tasks: [
        { title: "Finalize logo files", description: "Create all required formats", priority: "high", estimatedHours: 4 },
        { title: "Create logo variations", description: "Primary, secondary, icon versions", priority: "medium", estimatedHours: 3 },
        { title: "Prepare brand guidelines", description: "Logo usage guide", priority: "medium", estimatedHours: 3 },
        { title: "Final delivery", description: "Package and deliver files", priority: "high", estimatedHours: 2 },
      ],
      acceptanceCriteria: [
        "All file formats delivered",
        "Brand guidelines included",
        "Client approval received",
      ],
    },
  ],
  "social-media": [
    {
      name: "Social Media Discovery",
      description: "Audit current presence and define strategy",
      type: "discovery",
      estimatedDays: 3,
      tasks: [
        { title: "Audit existing profiles", description: "Review current social media presence", priority: "high", estimatedHours: 4 },
        { title: "Identify target platforms", description: "Determine which platforms to focus on", priority: "high", estimatedHours: 2 },
        { title: "Define content objectives", description: "Set goals for content strategy", priority: "high", estimatedHours: 3 },
        { title: "Establish posting frequency", description: "Define content calendar cadence", priority: "medium", estimatedHours: 2 },
        { title: "Define content categories", description: "Establish content pillars", priority: "medium", estimatedHours: 3 },
        { title: "Prepare social media strategy", description: "Create comprehensive plan", priority: "high", estimatedHours: 6 },
      ],
      acceptanceCriteria: [
        "Current audit completed",
        "Strategy approved",
        "Content calendar planned",
      ],
    },
    {
      name: "Content Creation",
      description: "Create initial content and templates",
      type: "development",
      estimatedDays: 5,
      tasks: [
        { title: "Create content templates", description: "Design reusable post templates", priority: "high", estimatedHours: 6 },
        { title: "Write initial content batch", description: "Create first week of posts", priority: "high", estimatedHours: 8 },
        { title: "Design graphics", description: "Create visual assets", priority: "medium", estimatedHours: 8 },
        { title: "Set up scheduling tools", description: "Configure automation", priority: "medium", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "Templates created",
        "First week content ready",
        "Scheduling configured",
      ],
    },
  ],
  "video": [
    {
      name: "Video Discovery & Pre-production",
      description: "Plan the video project",
      type: "discovery",
      estimatedDays: 3,
      tasks: [
        { title: "Determine video objective", description: "Define what the video should achieve", priority: "high", estimatedHours: 2 },
        { title: "Identify target audience", description: "Define who will watch", priority: "high", estimatedHours: 2 },
        { title: "Determine format and style", description: "Decide on video type and tone", priority: "high", estimatedHours: 3 },
        { title: "Write script/storyboard", description: "Create the narrative structure", priority: "high", estimatedHours: 8 },
        { title: "Plan production requirements", description: "Equipment, location, talent needs", priority: "medium", estimatedHours: 4 },
        { title: "Create production schedule", description: "Plan filming timeline", priority: "medium", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "Script approved",
        "Storyboard approved",
        "Production plan finalized",
      ],
    },
    {
      name: "Production",
      description: "Film and record the video content",
      type: "development",
      estimatedDays: 3,
      tasks: [
        { title: "Set up equipment", description: "Prepare cameras, audio, lighting", priority: "high", estimatedHours: 4 },
        { title: "Film content", description: "Record all video footage", priority: "high", estimatedHours: 8 },
        { title: "Record audio", description: "Capture voiceover and sound", priority: "high", estimatedHours: 4 },
        { title: "Capture B-roll", description: "Record supplementary footage", priority: "medium", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "All footage captured",
        "Audio quality verified",
        "Content review completed",
      ],
    },
    {
      name: "Post-production",
      description: "Edit and finalize the video",
      type: "development",
      estimatedDays: 5,
      tasks: [
        { title: "Edit video", description: "Assemble and edit footage", priority: "high", estimatedHours: 12 },
        { title: "Add graphics and effects", description: "Include titles, transitions, animations", priority: "medium", estimatedHours: 6 },
        { title: "Color correction", description: "Enhance visual quality", priority: "medium", estimatedHours: 4 },
        { title: "Sound design", description: "Mix audio, add music", priority: "medium", estimatedHours: 4 },
        { title: "Client review", description: "Present for feedback", priority: "high", estimatedHours: 2 },
        { title: "Final export", description: "Render in required formats", priority: "high", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "Video approved by client",
        "All formats exported",
        "Deliverables handed over",
      ],
    },
  ],
  "consultancy": [
    {
      name: "Business/Technical Discovery",
      description: "Understand the problem and gather information",
      type: "discovery",
      estimatedDays: 3,
      tasks: [
        { title: "Understand the core problem", description: "Deep dive into the challenge", priority: "high", estimatedHours: 4 },
        { title: "Gather existing information", description: "Review documents, data, systems", priority: "high", estimatedHours: 4 },
        { title: "Identify stakeholders", description: "Map all involved parties", priority: "medium", estimatedHours: 2 },
        { title: "Identify constraints", description: "Budget, time, technical limitations", priority: "high", estimatedHours: 2 },
        { title: "Prepare recommendations framework", description: "Outline analysis approach", priority: "high", estimatedHours: 4 },
      ],
      acceptanceCriteria: [
        "Problem clearly defined",
        "Data gathered",
        "Analysis approach approved",
      ],
    },
    {
      name: "Analysis & Recommendations",
      description: "Analyze findings and prepare recommendations",
      type: "development",
      estimatedDays: 5,
      tasks: [
        { title: "Analyze data", description: "Process gathered information", priority: "high", estimatedHours: 8 },
        { title: "Identify solutions", description: "Develop recommendation options", priority: "high", estimatedHours: 8 },
        { title: "Prepare deliverable", description: "Create report or presentation", priority: "high", estimatedHours: 8 },
        { title: "Present findings", description: "Walk through recommendations", priority: "high", estimatedHours: 3 },
      ],
      acceptanceCriteria: [
        "Analysis completed",
        "Recommendations presented",
        "Client feedback received",
      ],
    },
  ],
};

// Default fallback stages for project types not in the template
const DEFAULT_STAGES: StageTemplate[] = [
  {
    name: "Discovery & Planning",
    description: "Gather requirements and plan the project",
    type: "discovery",
    estimatedDays: 3,
    tasks: [
      { title: "Review requirements", description: "Analyze client needs", priority: "high", estimatedHours: 4 },
      { title: "Create project plan", description: "Define milestones and timeline", priority: "high", estimatedHours: 4 },
      { title: "Identify risks", description: "Document potential challenges", priority: "medium", estimatedHours: 2 },
    ],
    acceptanceCriteria: ["Project plan approved", "Requirements documented"],
  },
  {
    name: "Execution",
    description: "Deliver the project work",
    type: "development",
    estimatedDays: 10,
    tasks: [
      { title: "Execute project deliverables", description: "Complete all required work", priority: "high", estimatedHours: 40 },
      { title: "Regular progress updates", description: "Provide status reports", priority: "medium", estimatedHours: 4 },
    ],
    acceptanceCriteria: ["All deliverables completed", "Quality verified"],
  },
  {
    name: "Review & Delivery",
    description: "Review and deliver final work",
    type: "review",
    estimatedDays: 2,
    tasks: [
      { title: "Final review", description: "Quality check all deliverables", priority: "high", estimatedHours: 4 },
      { title: "Client approval", description: "Get sign-off", priority: "high", estimatedHours: 2 },
      { title: "Handover", description: "Deliver final assets", priority: "high", estimatedHours: 2 },
    ],
    acceptanceCriteria: ["Client approval received", "All deliverables handed over"],
  },
];

export function getStageTemplates(projectType: string): StageTemplate[] {
  return STAGE_TEMPLATES[projectType] || DEFAULT_STAGES;
}

export function generateStagesForProject(
  projectType: string,
  overrides?: { name?: string; description?: string; estimatedDays?: number }[]
): StageTemplate[] {
  const templates = getStageTemplates(projectType);

  if (overrides) {
    return templates.map((template, i) => ({
      ...template,
      ...(overrides[i] || {}),
    }));
  }

  return templates;
}
