import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";

const DEMO_TEMPLATES: Record<string, object> = {
  website: {
    sections: ["hero", "features", "about", "testimonials", "cta", "footer"],
    style: "modern",
    colors: ["#6366f1", "#8b5cf6", "#a855f7"],
  },
  "mobile-app": {
    screens: ["splash", "home", "profile", "settings", "notifications"],
    style: "material",
    colors: ["#3b82f6", "#2563eb", "#1d4ed8"],
  },
  ecommerce: {
    sections: ["hero", "categories", "featured", "deals", "newsletter", "footer"],
    style: "clean",
    colors: ["#f59e0b", "#d97706", "#b45309"],
  },
  "ai-automation": {
    sections: ["hero", "capabilities", "demo", "pricing", "faq", "footer"],
    style: "futuristic",
    colors: ["#10b981", "#059669", "#047857"],
  },
  "erp-crm": {
    sections: ["hero", "modules", "dashboard-preview", "integrations", "pricing", "footer"],
    style: "professional",
    colors: ["#3b82f6", "#1e40af", "#1e3a5f"],
  },
  "content-seo": {
    sections: ["hero", "services", "portfolio", "results", "contact", "footer"],
    style: "creative",
    colors: ["#ec4899", "#db2777", "#be185d"],
  },
};

function generateDemoHTML(requirements: Record<string, unknown>, projectId: string): string {
  const template = DEMO_TEMPLATES[requirements.projectType as string] || DEMO_TEMPLATES.website;
  const name = requirements.name || "Your Project";
  const projectType = (requirements.projectType as string)?.replace(/-/g, " ") || "website";
  const features = (requirements.features as string[]) || [];
  const budget = requirements.budget || "TBD";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - ${projectType} Demo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { font-family: 'Inter', sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, ${(template as { colors: string[] }).colors[0]}, ${(template as { colors: string[] }).colors[1]}, ${(template as { colors: string[] }).colors[2]}); }
    .float { animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  </style>
</head>
<body class="bg-gray-50">
  <!-- Hero Section -->
  <section class="gradient-bg text-white py-20 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <div class="inline-block bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
        AI-Generated Demo Preview
      </div>
      <h1 class="text-5xl font-bold mb-6">${name}</h1>
      <p class="text-xl opacity-90 max-w-2xl mx-auto mb-8">
        Your custom ${projectType} project — built with cutting-edge technology and designed for success.
      </p>
      <div class="flex gap-4 justify-center">
        <a href="/checkout/${projectId}" class="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
          Proceed to Checkout
        </a>
        <button class="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
          Learn More
        </button>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Key Features</h2>
      <div class="grid md:grid-cols-3 gap-8">
        ${features.map((f: string) => `
        <div class="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
          <div class="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">${f}</h3>
          <p class="text-gray-600 text-sm">Professional implementation of ${f.toLowerCase()} tailored to your business needs.</p>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="bg-gray-900 text-white py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4">Ready to Build This?</h2>
      <p class="text-gray-400 mb-8">Estimated budget: $${budget} — Get started today with Wall-V.</p>
      <a href="/checkout/${projectId}" class="inline-block gradient-bg text-white px-10 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity">
        Pay & Start Building
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-100 py-8 px-6 text-center text-gray-500 text-sm">
    <p>Generated by Wall-V AI — <a href="/" class="text-primary hover:underline">wall-v.com</a></p>
  </footer>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requirements, language = "en" } = body;

    if (!requirements?.projectType || !requirements?.name || !requirements?.email) {
      return NextResponse.json(
        { error: "Project type, name, and email are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const projectId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const demoHTML = generateDemoHTML(requirements, projectId);

    const project = await Project.create({
      title: `${requirements.name} - ${(requirements.projectType as string)?.replace(/-/g, " ")}`,
      description: requirements.description || `Custom ${requirements.projectType} project for ${requirements.name}`,
      client: {
        name: requirements.name,
        email: requirements.email,
      },
      requirements: {
        projectType: requirements.projectType,
        features: requirements.features || [],
        budget: requirements.budget,
        timeline: requirements.timeline,
        designStyle: requirements.designStyle,
      },
      demoHTML,
      demoId: projectId,
      status: "demo",
      language,
      quote: {
        min: parseInt(requirements.budget as string) || 1000,
        max: (parseInt(requirements.budget as string) || 1000) * 2,
        currency: "USD",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project._id.toString(),
        demoId: projectId,
        previewUrl: `/preview/${project._id}`,
        checkoutUrl: `/checkout/${project._id}`,
      },
    });
  } catch (error) {
    console.error("Demo generation error:", error);
    return NextResponse.json({ error: "Failed to generate demo" }, { status: 500 });
  }
}
