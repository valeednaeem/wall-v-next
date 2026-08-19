"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, Clock, CreditCard, Eye, ExternalLink,
  DollarSign, Calendar, ArrowRight, FileText, Settings,
  AlertTriangle, ArrowUpRight, ChevronDown, ChevronUp,
  Shield, Sparkles, Layers, Target, GitBranch, AlertCircle
} from "lucide-react";

interface CostItem {
  name: string;
  description: string;
  amount: number;
  confirmed: boolean;
  category: string;
  verificationStatus: "confirmed" | "estimate" | "requires-verification";
  source: "database" | "calculated" | "standard" | "external";
}

interface CostBreakdown {
  items: CostItem[];
  subtotal: number;
}

interface CostAnalysis {
  developmentCost: CostBreakdown;
  thirdPartyCosts: CostBreakdown;
  recurringCosts: CostBreakdown;
  oneTimeCosts: CostBreakdown;
  totalEstimated: number;
  currency: string;
  confidenceLevel: "high" | "medium" | "low";
  assumptions: string[];
  priceVerificationNotes: string[];
  includedItems: string[];
  excludedItems: string[];
  confirmedPrices: string[];
  estimatedPrices: string[];
  requiresVerification: string[];
}

interface BudgetComparison {
  clientBudget: number | null;
  estimatedTotal: number;
  difference: number | null;
  status: "within-budget" | "below-budget" | "slightly-above" | "significantly-above" | "budget-not-provided";
  recommendations: string[];
  topCostDrivers: { name: string; amount: number; percentage: number }[];
  reducedMilestoneProposal?: {
    name: string;
    description: string;
    estimatedCost: number;
    deliverables: string[];
  };
}

interface Milestone {
  index: number;
  name: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "generated" | "review" | "approved" | "changes-requested";
  amount: number;
  dueDate?: string;
  completedAt?: string;
  deliverables?: string[];
  outputType?: string;
  prototypeGenerated?: boolean;
  previewUrl?: string | null;
  prototypeHTML?: string;
}

interface FirstMilestone {
  name: string;
  description: string;
  deliverables: string[];
  outputType: "ui-prototype" | "interactive-frontend" | "landing-page" | "dashboard-prototype" | "application-shell" | "feature-demonstration" | "ai-agent-prototype" | "workflow-prototype" | "design-concept" | "technical-poc";
  prototypeGenerated: boolean;
  previewUrl: string | null;
  prototypeHTML?: string;
}

interface ProductionSummary {
  whatWillBeProduced: string;
  description: string;
  targetOutcome: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  budget: number;
  currency: string;
  milestones: Milestone[];
  quote: { min: number; max: number; currency: string };
  requirements: {
    projectType?: string;
    features?: string[];
    timeline?: string;
    objective?: string;
    industry?: string;
    targetAudience?: string;
    integrations?: string[];
    authRequired?: boolean;
    adminDashboard?: boolean;
    clientDashboard?: boolean;
    apiRequired?: boolean;
    seoRequired?: boolean;
    mobileRequired?: boolean;
    hostingRequired?: boolean;
  };
  client: { name: string; email: string };
  demoId?: string;
  createdAt: string;
  costAnalysis?: CostAnalysis;
  budgetComparison?: BudgetComparison;
  firstMilestone?: FirstMilestone;
  productionSummary?: ProductionSummary;
  workflowStatus?: {
    stage: string;
    lastUpdated: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  demo: { label: "Demo Ready", color: "bg-indigo-50 text-indigo-700" },
  planning: { label: "Planning", color: "bg-blue-50 text-blue-700" },
  "in-progress": { label: "In Progress", color: "bg-yellow-50 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-50 text-green-700" },
  "pending-payment": { label: "Pending Payment", color: "bg-amber-50 text-amber-700" },
};

export default function ClientPortalPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.project) {
        setProject({
          ...data.project,
          id: data.project._id,
        });
      } else {
        setError("Project not found");
      }
    } catch {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Project Not Found</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[project.status] || STATUS_LABELS.planning;
  const completedMilestones = project.milestones.filter((m) => m.status === "completed").length;
  const totalMilestoneAmount = project.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const paidAmount = project.milestones
    .filter((m) => m.status === "completed" || m.status === "in-progress")
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Client Portal</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {project.demoId && (
            <Link
              href={`/preview/${project.id}`}
              target="_blank"
              className="flex items-center gap-3 bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
            >
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">View Demo</p>
                <p className="text-xs text-muted-foreground">Preview your project</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </Link>
          )}
          <Link
            href={`/checkout/${project.id}`}
            target="_blank"
            className="flex items-center gap-3 bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
          >
            <CreditCard className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-sm">Make Payment</p>
              <p className="text-xs text-muted-foreground">Pay milestone or full project</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </Link>
          <div className="flex items-center gap-3 bg-white rounded-xl border p-4">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-sm">${paidAmount.toLocaleString()} Paid</p>
              <p className="text-xs text-muted-foreground">of ${totalMilestoneAmount.toLocaleString()} total</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Project Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-sm font-medium">{project.progress}%</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{project.requirements?.projectType?.replace(/-/g, " ") || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Features</p>
              <p className="font-medium">{project.requirements?.features?.length || 0} included</p>
            </div>
            <div>
              <p className="text-muted-foreground">Timeline</p>
              <p className="font-medium">{project.requirements?.timeline || "Flexible"}</p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Milestones</h2>
            <span className="text-sm text-muted-foreground">{completedMilestones}/{project.milestones.length} completed</span>
          </div>

          {project.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No milestones defined yet.</p>
          ) : (
            <div className="space-y-3">
              {project.milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20">
                  {m.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : m.status === "in-progress" ? (
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {m.name}
                    </p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {m.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {m.amount > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${m.amount.toLocaleString()}
                        </span>
                      )}
                      {m.status === "in-progress" && (
                        <Link
                          href={`/checkout/${project.id}?milestone=${m.index}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Pay Now <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    m.status === "completed" ? "bg-green-50 text-green-700" :
                    m.status === "in-progress" ? "bg-yellow-50 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {m.status === "completed" ? "Done" : m.status === "in-progress" ? "Active" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Description */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Project Details</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          {project.requirements?.features && project.requirements.features.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">FEATURES</p>
              <div className="flex flex-wrap gap-1">
                {project.requirements.features.map((f, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Requirements Section */}
          <ExpandableSection title="Requirements" icon={<FileText />}>
            <div className="space-y-4">
              {project.requirements?.objective && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Business Purpose</p>
                  <p className="text-sm">{project.requirements.objective}</p>
                </div>
              )}
              {project.requirements?.industry && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Industry</p>
                  <p className="text-sm">{project.requirements.industry}</p>
                </div>
              )}
              {project.requirements?.targetAudience && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Target Audience</p>
                  <p className="text-sm">{project.requirements.targetAudience}</p>
                </div>
              )}
              {project.requirements?.integrations && project.requirements.integrations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Integrations</p>
                  <div className="flex flex-wrap gap-1">
                    {project.requirements.integrations.map((i, idx) => (
                      <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Authentication</p>
                  <StatusBadge className={project.requirements?.authRequired ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.authRequired ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Admin Dashboard</p>
                  <StatusBadge className={project.requirements?.adminDashboard ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.adminDashboard ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Client Dashboard</p>
                  <StatusBadge className={project.requirements?.clientDashboard ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.clientDashboard ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">API Required</p>
                  <StatusBadge className={project.requirements?.apiRequired ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.apiRequired ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">SEO Required</p>
                  <StatusBadge className={project.requirements?.seoRequired ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.seoRequired ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mobile Support</p>
                  <StatusBadge className={project.requirements?.mobileRequired ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.mobileRequired ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Hosting Required</p>
                  <StatusBadge className={project.requirements?.hostingRequired ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                    {project.requirements?.hostingRequired ? "Required" : "Not Required"}
                  </StatusBadge>
                </div>
              </div>
            </div>
          </ExpandableSection>

          {/* Production Summary Section */}
          {project.productionSummary && (
            <ExpandableSection title="Production Summary" icon={<Sparkles />} defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">What Will Be Produced</p>
                  <p className="text-lg font-semibold">{project.productionSummary.whatWillBeProduced}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{project.productionSummary.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Target Outcome</p>
                  <p className="text-sm text-muted-foreground">{project.productionSummary.targetOutcome}</p>
                </div>
              </div>
            </ExpandableSection>
          )}

          {/* First Milestone Section */}
          {project.firstMilestone && (
            <ExpandableSection title="First Milestone" icon={<Target />} defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Name</p>
                  <p className="text-lg font-semibold">{project.firstMilestone.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{project.firstMilestone.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Output Type</p>
                  <StatusBadge className="bg-primary/10 text-primary">
                    {project.firstMilestone.outputType.replace(/-/g, " ")}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Deliverables</p>
                  <ul className="space-y-1">
                    {project.firstMilestone.deliverables.map((d, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                {project.firstMilestone.prototypeGenerated && project.firstMilestone.previewUrl && (
                  <div className="pt-4 border-t">
                    <Link
                      href={project.firstMilestone.previewUrl}
                      target="_blank"
                      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Prototype Preview
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </ExpandableSection>
          )}

          {/* Cost Analysis Section */}
          {project.costAnalysis && (
            <ExpandableSection title="Cost Breakdown" icon={<DollarSign />}>
              <div className="space-y-6">
                {/* Development Costs */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Development Costs (${project.costAnalysis.developmentCost.subtotal.toLocaleString()})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.costAnalysis.developmentCost.items.map((item, idx) => (
                          <CostItemRow key={idx} item={item} />
                        ))}
                        <tr className="bg-muted/50 font-semibold">
                          <td className="px-4 py-2" colSpan={2}>Development Subtotal</td>
                          <td className="px-4 py-2 text-right">${project.costAnalysis.developmentCost.subtotal.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Third-Party Costs */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Third-Party Costs (${project.costAnalysis.thirdPartyCosts.subtotal.toLocaleString()})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.costAnalysis.thirdPartyCosts.items.map((item, idx) => (
                          <CostItemRow key={idx} item={item} />
                        ))}
                        <tr className="bg-muted/50 font-semibold">
                          <td className="px-4 py-2" colSpan={2}>Third-Party Subtotal</td>
                          <td className="px-4 py-2 text-right">${project.costAnalysis.thirdPartyCosts.subtotal.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recurring Costs */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Recurring Costs (Monthly: ${project.costAnalysis.recurringCosts.subtotal.toLocaleString()})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2 text-right">Monthly Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.costAnalysis.recurringCosts.items.map((item, idx) => (
                          <CostItemRow key={idx} item={item} />
                        ))}
                        <tr className="bg-muted/50 font-semibold">
                          <td className="px-4 py-2" colSpan={2}>Monthly Recurring Subtotal</td>
                          <td className="px-4 py-2 text-right">${project.costAnalysis.recurringCosts.subtotal.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Annual estimate: ${(project.costAnalysis.recurringCosts.subtotal * 12).toLocaleString()}</p>
                </div>

                {/* One-Time Costs */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    One-Time Costs (${project.costAnalysis.oneTimeCosts.subtotal.toLocaleString()})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.costAnalysis.oneTimeCosts.items.map((item, idx) => (
                          <CostItemRow key={idx} item={item} />
                        ))}
                        <tr className="bg-muted/50 font-semibold">
                          <td className="px-4 py-2" colSpan={2}>One-Time Subtotal</td>
                          <td className="px-4 py-2 text-right">${project.costAnalysis.oneTimeCosts.subtotal.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Estimated Project Total</span>
                    <span className="text-2xl font-bold text-primary">${project.costAnalysis.totalEstimated.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Confidence: {project.costAnalysis.confidenceLevel}</p>
                </div>

                {/* Price Verification Notes */}
                {project.costAnalysis.requiresVerification.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Prices Requiring Verification
                    </h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      {project.costAnalysis.requiresVerification.map((note, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Included/Excluded */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      What's Included
                    </h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      {project.costAnalysis.includedItems.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      What's Excluded
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {project.costAnalysis.excludedItems.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </ExpandableSection>
          )}

          {/* Budget Comparison Section */}
          {project.budgetComparison && (
            <ExpandableSection title="Budget Comparison" icon={<AlertTriangle />} defaultOpen={true}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Client Budget</p>
                    <p className="text-2xl font-bold">{project.budgetComparison.clientBudget ? `$${project.budgetComparison.clientBudget.toLocaleString()}` : "Not provided"}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Estimated Total</p>
                    <p className="text-2xl font-bold">${project.budgetComparison.estimatedTotal.toLocaleString()}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Difference</p>
                    <p className={`text-2xl font-bold ${project.budgetComparison.difference !== null && project.budgetComparison.difference >= 0 ? "text-green-600" : project.budgetComparison.difference !== null ? "text-red-600" : "text-gray-600"}`}>
                      {project.budgetComparison.difference !== null
                        ? `${project.budgetComparison.difference >= 0 ? "+" : ""}$${project.budgetComparison.difference.toLocaleString()}`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <BudgetStatusBadge status={project.budgetComparison.status} />
                  <span className="text-sm text-muted-foreground">
                    {project.budgetComparison.status === "within-budget" && "Project is within your budget"}
                    {project.budgetComparison.status === "below-budget" && "Project is below your budget"}
                    {project.budgetComparison.status === "slightly-above" && "Project slightly exceeds your budget"}
                    {project.budgetComparison.status === "significantly-above" && "Project significantly exceeds your budget"}
                    {project.budgetComparison.status === "budget-not-provided" && "No budget provided for comparison"}
                  </span>
                </div>

                {project.budgetComparison.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1 text-sm">
                      {project.budgetComparison.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowUpRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.budgetComparison.topCostDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Top Cost Drivers</p>
                    <div className="space-y-2">
                      {project.budgetComparison.topCostDrivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                          <span>{driver.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">${driver.amount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">({driver.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {project.budgetComparison.reducedMilestoneProposal && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Reduced Milestone Proposal
                    </h4>
                    <p className="font-medium mb-1">{project.budgetComparison.reducedMilestoneProposal.name}</p>
                    <p className="text-sm text-yellow-700 mb-2">{project.budgetComparison.reducedMilestoneProposal.description}</p>
                    <p className="font-semibold mb-2">Estimated Cost: ${project.budgetComparison.reducedMilestoneProposal.estimatedCost.toLocaleString()}</p>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Deliverables:</p>
                    <ul className="space-y-1 text-sm">
                      {project.budgetComparison.reducedMilestoneProposal.deliverables.map((d, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                          {d}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/checkout/${project.id}?milestone=reduced`}
                      className="mt-4 inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Proceed with Reduced Milestone
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </ExpandableSection>
          )}

          {/* Workflow Status */}
          {project.workflowStatus && (
            <ExpandableSection title="Workflow Status" icon={<GitBranch />}>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Current Stage: </span>
                  <StatusBadge className="bg-primary/10 text-primary capitalize">
                    {project.workflowStatus.stage.replace(/-/g, " ")}
                  </StatusBadge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(project.workflowStatus.lastUpdated).toLocaleString()}
                </p>
              </div>
            </ExpandableSection>
          )}

          {/* Checkout Action */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
            <h3 className="font-semibold mb-2">Ready to proceed?</h3>
            <p className="text-sm text-muted-foreground mb-4">Review the details above and proceed to checkout when ready.</p>
            <Link
              href={`/checkout/${project.id}`}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="h-5 w-5" />
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

// Cost item row
function CostItemRow({ item, indent = false }: { item: CostItem; indent?: boolean }) {
  return (
    <tr className="border-t">
      <td className={`px-4 py-2 text-sm ${indent ? "pl-8" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <StatusBadge
            className={
              item.verificationStatus === "confirmed"
                ? "bg-green-50 text-green-700"
                : item.verificationStatus === "estimate"
                ? "bg-yellow-50 text-yellow-700"
                : "bg-orange-50 text-orange-700"
            }
          >
            {item.verificationStatus}
          </StatusBadge>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">{item.description}</td>
      <td className="px-4 py-2 text-sm font-medium text-right">${item.amount.toLocaleString()}</td>
    </tr>
  );
}

// Budget status badge
function BudgetStatusBadge({ status }: { status: BudgetComparison["status"] }) {
  const configs: Record<BudgetComparison["status"], { label: string; className: string }> = {
    "within-budget": { label: "Within Budget", className: "bg-green-50 text-green-700" },
    "below-budget": { label: "Below Budget", className: "bg-blue-50 text-blue-700" },
    "slightly-above": { label: "Slightly Above", className: "bg-yellow-50 text-yellow-700" },
    "significantly-above": { label: "Significantly Above", className: "bg-red-50 text-red-700" },
    "budget-not-provided": { label: "Budget Not Provided", className: "bg-gray-50 text-gray-700" },
  };
  const config = configs[status];
  return <StatusBadge className={config.className}>{config.label}</StatusBadge>;
}

// Expandable section
function ExpandableSection({ title, children, icon, defaultOpen = false }: { title: string; children: React.ReactNode; icon: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <span className="h-5 w-5 text-primary">{icon}</span>
        <h3 className="font-semibold flex-1 text-left">{title}</h3>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`${open ? "block" : "hidden"} animate-slide-down`}>
        <div className="px-6 pb-6 border-t">{children}</div>
      </div>
    </div>
  );
}
