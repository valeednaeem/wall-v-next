/**
 * Task Decomposition Engine — AI breaks projects into tasks.
 *
 * Takes a project (or project description) and produces:
 * - Phases
 * - Milestones
 * - Tasks with dependencies
 * - Subtasks
 * - Acceptance criteria
 * - Estimated effort
 *
 * Uses deterministic rules for structure, AI for requirement interpretation.
 */

import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/task";
import Project from "@/models/project";

export interface DecomposedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedHours: number;
  dependencies: string[];
  acceptanceCriteria: string[];
  subtasks: { title: string }[];
  tags: string[];
  requiredSkills: string[];
}

export interface DecomposedMilestone {
  name: string;
  description: string;
  tasks: DecomposedTask[];
}

export interface DecomposedPhase {
  name: string;
  description: string;
  milestones: DecomposedMilestone[];
}

export interface DecompositionResult {
  phases: DecomposedPhase[];
  totalTasks: number;
  totalEstimatedHours: number;
  criticalPath: string[];
  riskAreas: string[];
}

/**
 * Decompose a project into phases, milestones, and tasks.
 * This uses pattern matching on project type + requirements to generate
 * a structured work breakdown.
 */
export async function decomposeProject(projectId: string): Promise<DecompositionResult> {
  await connectToDatabase();

  const project = await Project.findById(projectId).lean() as any;
  if (!project) throw new Error("Project not found");

  const projectType = project.projectType || project.type || "custom";
  const description = project.description || "";
  const requirements = (project.requirements || []).map((r: any) => r.title || r.description || r);
  const features = (project.scope?.features || []) as string[];

  // Generate decomposition based on project type
  const decomposition = generateDecomposition(projectType, description, requirements, features);

  // Create task records in database
  const createdTasks: any[] = [];
  let order = 0;

  for (const phase of decomposition.phases) {
    for (const milestone of phase.milestones) {
      for (const task of milestone.tasks) {
        order++;
        const created = await Task.create({
          title: task.title,
          description: task.description,
          project: projectId,
          reporter: project.projectManager || project.team?.[0]?.user || project.createdBy,
          status: "todo",
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          loggedHours: 0,
          dependencies: [],
          tags: task.tags,
          subtasks: task.subtasks.map((s) => ({ title: s.title, completed: false })),
          acceptanceCriteria: task.acceptanceCriteria,
          order,
        });
        createdTasks.push({ ...created.toObject(), _phase: phase.name, _milestone: milestone.name });
      }
    }
  }

  // Wire dependencies by matching task titles
  for (const task of createdTasks) {
    const decomposed = decomposition.phases
      .flatMap((p) => p.milestones)
      .flatMap((m) => m.tasks)
      .find((t) => t.title === task.title);

    if (decomposed?.dependencies.length) {
      const depIds = createdTasks
        .filter((t) => decomposed.dependencies.includes(t.title))
        .map((t) => t._id);
      if (depIds.length) {
        await Task.findByIdAndUpdate(task._id, { $set: { dependencies: depIds } });
      }
    }
  }

  return decomposition;
}

/**
 * Generate decomposition based on project type.
 * Deterministic — no LLM call for structure.
 */
function generateDecomposition(
  projectType: string,
  description: string,
  requirements: string[],
  features: string[]
): DecompositionResult {
  const phases: DecomposedPhase[] = [];
  let totalTasks = 0;
  let totalHours = 0;

  // Phase 1: Discovery & Planning
  phases.push({
    name: "Discovery & Planning",
    description: "Requirements gathering, analysis, and project planning",
    milestones: [
      {
        name: "Requirements Complete",
        description: "All requirements documented and approved",
        tasks: [
          {
            title: "Gather and document requirements",
            description: "Collect all project requirements from stakeholders",
            priority: "high",
            estimatedHours: 8,
            dependencies: [],
            acceptanceCriteria: ["Requirements document complete", "Stakeholder sign-off"],
            subtasks: [{ title: "Stakeholder interviews" }, { title: "Requirements document" }, { title: "Review meeting" }],
            tags: ["requirements"],
            requiredSkills: ["client-communication", "project-management"],
          },
          {
            title: "Create project plan",
            description: "Define scope, timeline, resources, and milestones",
            priority: "high",
            estimatedHours: 6,
            dependencies: ["Gather and document requirements"],
            acceptanceCriteria: ["Project plan approved", "Timeline established"],
            subtasks: [{ title: "Scope definition" }, { title: "Timeline creation" }, { title: "Resource planning" }],
            tags: ["planning"],
            requiredSkills: ["project-management"],
          },
          {
            title: "Risk assessment",
            description: "Identify and assess project risks",
            priority: "medium",
            estimatedHours: 4,
            dependencies: ["Gather and document requirements"],
            acceptanceCriteria: ["Risk register created", "Mitigation plans defined"],
            subtasks: [{ title: "Risk identification" }, { title: "Impact analysis" }, { title: "Mitigation planning" }],
            tags: ["risk"],
            requiredSkills: ["project-management"],
          },
        ],
      },
    ],
  });

  // Phase 2: Design
  phases.push({
    name: "Design",
    description: "UI/UX design, architecture, and technical design",
    milestones: [
      {
        name: "Design Approved",
        description: "All designs reviewed and approved",
        tasks: [
          {
            title: "Create wireframes",
            description: "Design wireframes for all pages/components",
            priority: "high",
            estimatedHours: 12,
            dependencies: ["Create project plan"],
            acceptanceCriteria: ["Wireframes for all pages", "Client review complete"],
            subtasks: [{ title: "Page layout wireframes" }, { title: "Component wireframes" }, { title: "Navigation flow" }],
            tags: ["design", "ui"],
            requiredSkills: ["design"],
          },
          {
            title: "Create visual design",
            description: "Apply visual design system to wireframes",
            priority: "high",
            estimatedHours: 16,
            dependencies: ["Create wireframes"],
            acceptanceCriteria: ["Visual designs complete", "Design system applied"],
            subtasks: [{ title: "Color palette" }, { title: "Typography" }, { title: "Component styles" }, { title: "Responsive designs" }],
            tags: ["design", "ui", "visual"],
            requiredSkills: ["design"],
          },
          {
            title: "Technical architecture",
            description: "Define system architecture and tech stack decisions",
            priority: "high",
            estimatedHours: 8,
            dependencies: ["Create project plan"],
            acceptanceCriteria: ["Architecture document", "Tech stack confirmed"],
            subtasks: [{ title: "Architecture diagram" }, { title: "Database schema" }, { title: "API design" }],
            tags: ["architecture", "technical"],
            requiredSkills: ["development"],
          },
        ],
      },
    ],
  });

  // Phase 3: Development
  const devTasks: DecomposedTask[] = [];

  // Add feature-specific tasks
  const featureList = features.length > 0 ? features : requirements.length > 0 ? requirements : ["Core functionality"];

  for (const feature of featureList.slice(0, 10)) {
    devTasks.push({
      title: `Implement: ${feature}`,
      description: `Develop and implement ${feature}`,
      priority: "high",
      estimatedHours: 12,
      dependencies: ["Create visual design", "Technical architecture"],
      acceptanceCriteria: [`Feature ${feature} working`, "Unit tests pass", "Code reviewed"],
      subtasks: [{ title: "Backend implementation" }, { title: "Frontend implementation" }, { title: "Integration" }, { title: "Unit tests" }],
      tags: ["development", "feature"],
      requiredSkills: ["development"],
    });
  }

  // Always add core development tasks
  devTasks.push({
    title: "Set up development environment",
    description: "Configure dev environment, CI/CD, repositories",
    priority: "high",
    estimatedHours: 6,
    dependencies: ["Technical architecture"],
    acceptanceCriteria: ["Dev environment working", "CI/CD configured"],
    subtasks: [{ title: "Repository setup" }, { title: "CI/CD pipeline" }, { title: "Development guidelines" }],
    tags: ["setup", "devops"],
    requiredSkills: ["development"],
  });

  devTasks.push({
    title: "Database implementation",
    description: "Create database schema and migrations",
    priority: "high",
    estimatedHours: 8,
    dependencies: ["Technical architecture"],
    acceptanceCriteria: ["Schema created", "Migrations working", "Seed data ready"],
    subtasks: [{ title: "Schema design" }, { title: "Migrations" }, { title: "Seed data" }],
    tags: ["database", "backend"],
    requiredSkills: ["development"],
  });

  phases.push({
    name: "Development",
    description: "Core development and feature implementation",
    milestones: [
      {
        name: "Development Complete",
        description: "All features implemented and tested",
        tasks: devTasks,
      },
    ],
  });

  // Phase 4: Testing & QA
  phases.push({
    name: "Testing & QA",
    description: "Quality assurance, testing, and bug fixes",
    milestones: [
      {
        name: "QA Passed",
        description: "All testing complete, bugs resolved",
        tasks: [
          {
            title: "Write test cases",
            description: "Create comprehensive test cases for all features",
            priority: "high",
            estimatedHours: 10,
            dependencies: ["Implement: " + (featureList[0] || "Core functionality")],
            acceptanceCriteria: ["Test cases for all features", "Test plan approved"],
            subtasks: [{ title: "Functional tests" }, { title: "Edge case tests" }, { title: "Performance tests" }],
            tags: ["testing", "qa"],
            requiredSkills: ["development"],
          },
          {
            title: "Execute test suite",
            description: "Run all tests and document results",
            priority: "high",
            estimatedHours: 8,
            dependencies: ["Write test cases"],
            acceptanceCriteria: ["All tests passing", "Test report complete"],
            subtasks: [{ title: "Run tests" }, { title: "Document results" }, { title: "Bug reports" }],
            tags: ["testing", "qa"],
            requiredSkills: ["development"],
          },
          {
            title: "Fix identified bugs",
            description: "Resolve all bugs found during testing",
            priority: "high",
            estimatedHours: 12,
            dependencies: ["Execute test suite"],
            acceptanceCriteria: ["All critical bugs fixed", "Regression tests pass"],
            subtasks: [{ title: "Bug triage" }, { title: "Bug fixes" }, { title: "Regression testing" }],
            tags: ["bugfix", "qa"],
            requiredSkills: ["development"],
          },
        ],
      },
    ],
  });

  // Phase 5: Deployment
  phases.push({
    name: "Deployment & Launch",
    description: "Production deployment and launch activities",
    milestones: [
      {
        name: "Launched",
        description: "Project deployed and live",
        tasks: [
          {
            title: "Production deployment",
            description: "Deploy to production environment",
            priority: "urgent",
            estimatedHours: 4,
            dependencies: ["Fix identified bugs"],
            acceptanceCriteria: ["Deployed to production", "Smoke tests pass"],
            subtasks: [{ title: "Pre-deployment checks" }, { title: "Deploy" }, { title: "Post-deployment verification" }],
            tags: ["deployment", "devops"],
            requiredSkills: ["development"],
          },
          {
            title: "Client handover",
            description: "Deliver project to client with documentation",
            priority: "high",
            estimatedHours: 4,
            dependencies: ["Production deployment"],
            acceptanceCriteria: ["Documentation delivered", "Client training complete", "Handover signed"],
            subtasks: [{ title: "Documentation" }, { title: "Training session" }, { title: "Handover meeting" }],
            tags: ["handover", "client"],
            requiredSkills: ["client-communication", "project-management"],
          },
        ],
      },
    ],
  });

  // Calculate totals
  for (const phase of phases) {
    for (const milestone of phase.milestones) {
      for (const task of milestone.tasks) {
        totalTasks++;
        totalHours += task.estimatedHours;
      }
    }
  }

  return {
    phases,
    totalTasks,
    totalEstimatedHours: totalHours,
    criticalPath: ["Gather and document requirements", "Create project plan", "Technical architecture", "Development Complete", "Fix identified bugs", "Production deployment"],
    riskAreas: ["Requirements clarity", "Resource availability", "Integration complexity", "Timeline pressure"],
  };
}
