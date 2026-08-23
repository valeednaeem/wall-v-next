"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FolderKanban, Clock, CheckCircle2, AlertCircle, Pause, XCircle,
  DollarSign, FileText, Layers, Target, Activity, GitBranch, Users,
  Calendar, TrendingUp, AlertTriangle, ChevronRight, Plus, Loader2,
  Send, Check, X, MessageSquare, Bot, Settings, Edit2, Eye,
} from "lucide-react";

interface Stage {
  _id: string;
  name: string;
  description?: string;
  order: number;
  status: string;
  type: string;
  tasks: Task[];
  estimatedDays?: number;
  actualDays?: number;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  acceptanceCriteria: string[];
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: { name: string; email: string };
  estimatedHours?: number;
  loggedHours: number;
  dueDate?: string;
}

interface Requirement {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  scope: string;
  status: string;
  source: string;
  version: number;
}

interface ChangeRequest {
  _id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  requestedBy?: { name: string };
  reason: string;
  estimatedCost?: number;
  estimatedDays?: number;
  createdAt: string;
}

interface Activity {
  _id: string;
  actor?: { name: string };
  actorType: string;
  action: string;
  category: string;
  description: string;
  createdAt: string;
}

interface Quotation {
  _id: string;
  reference: string;
  total: number;
  currency: string;
  status: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  type: string;
  dueDate: string;
  createdAt: string;
}

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  method?: string;
  paidAt: string;
}

interface Project {
  _id: string;
  name: string;
  slug: string;
  description: string;
  projectType: string;
  status: string;
  lifecycleStatus: string;
  priority: string;
  budget: number;
  spent: number;
  currency: string;
  progress: number;
  startDate?: string;
  deadline?: string;
  client: { name?: string; email?: string } | string;
  clientRef?: { name: string; email: string };
  projectManager?: { name: string; email: string };
  stages: Stage[];
  currentStage?: Stage;
  requirements: Requirement[];
  changeRequests: ChangeRequest[];
  financial: {
    quotedAmount: number;
    approvedAmount: number;
    invoicedAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
    currency: string;
  };
  scope: {
    description: string;
    features: string[];
    exclusions: string[];
    version: number;
  };
  milestones: { name: string; status: string; amount?: number }[];
  tags: string[];
  notes?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-gray-600", bg: "bg-gray-100" },
  planning: { label: "Planning", color: "text-blue-600", bg: "bg-blue-100" },
  "in-progress": { label: "In Progress", color: "text-amber-600", bg: "bg-amber-100" },
  review: { label: "Review", color: "text-purple-600", bg: "bg-purple-100" },
  testing: { label: "Testing", color: "text-orange-600", bg: "bg-orange-100" },
  completed: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-100" },
  "on-hold": { label: "On Hold", color: "text-gray-600", bg: "bg-gray-100" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-100" },
};

const STAGE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  "under-review": "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-600",
  "in-progress": "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [generatingStages, setGeneratingStages] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project || data);
      }
    } catch { /* */ }
  }, [projectId]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch { /* */ }
  }, [projectId]);

  const fetchFinancials = useCallback(async () => {
    try {
      const [qRes, iRes, pRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/quotations`),
        fetch(`/api/projects/${projectId}/invoices`),
        fetch(`/api/projects/${projectId}/payments`),
      ]);
      if (qRes.ok) setQuotations((await qRes.json()).quotations || []);
      if (iRes.ok) setInvoices((await iRes.json()).invoices || []);
      if (pRes.ok) setPayments((await pRes.json()).payments || []);
    } catch { /* */ }
  }, [projectId]);

  useEffect(() => {
    Promise.all([fetchProject(), fetchActivities(), fetchFinancials()])
      .finally(() => setLoading(false));
  }, [fetchProject, fetchActivities, fetchFinancials]);

  const generateStages = async () => {
    setGeneratingStages(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/lifecycle/generate-stages`, { method: "POST" });
      if (res.ok) {
        await fetchProject();
        await fetchActivities();
      }
    } catch { /* */ }
    setGeneratingStages(false);
  };

  const updateStatus = async (status: string) => {
    try {
      await fetch(`/api/projects/${projectId}/lifecycle/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchProject();
      await fetchActivities();
    } catch { /* */ }
  };

  const updateStageStatus = async (stageId: string, status: string) => {
    try {
      await fetch(`/api/projects/stages/${stageId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchProject();
      await fetchActivities();
    } catch { /* */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Project not found</p>
        <Link href="/dashboard/projects" className="text-violet-600 hover:underline mt-2 inline-block">Back to projects</Link>
      </div>
    );
  }

  const sConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.new;
  const fin = project.financial || { quotedAmount: 0, approvedAmount: 0, invoicedAmount: 0, paidAmount: 0, outstandingAmount: 0, overdueAmount: 0, currency: "USD" };

  const tabs = [
    { id: "overview", label: "Overview", icon: <FolderKanban className="w-4 h-4" /> },
    { id: "stages", label: "Stages", icon: <Layers className="w-4 h-4" />, count: project.stages?.length },
    { id: "requirements", label: "Requirements", icon: <Target className="w-4 h-4" />, count: project.requirements?.length },
    { id: "financials", label: "Financials", icon: <DollarSign className="w-4 h-4" /> },
    { id: "changes", label: "Changes", icon: <GitBranch className="w-4 h-4" />, count: project.changeRequests?.length },
    { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/projects" className="p-2 hover:bg-gray-100 rounded-lg mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${sConf.bg} ${sConf.color}`}>
                {sConf.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {project.projectType} &middot; {project.clientRef?.name || (typeof project.client === "object" ? project.client.name : "No client")} &middot; Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.stages?.length === 0 && (
            <button
              onClick={generateStages}
              disabled={generatingStages}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm"
            >
              {generatingStages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              Generate Stages
            </button>
          )}
          <Link
            href={`/dashboard/projects/${project._id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Lifecycle Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Lifecycle Progress</span>
          <span className="text-sm text-gray-500 capitalize">{project.lifecycleStatus?.replace(/-/g, " ")}</span>
        </div>
        <div className="flex items-center gap-1">
          {["request", "inquiry", "project-created", "requirements-gathered", "quoted", "scope-approved", "invoiced", "paid", "executing", "completed"].map((step, i) => {
            const lifecycleSteps = ["request", "inquiry", "project-created", "requirements-gathered", "quoted", "scope-approved", "invoiced", "paid", "executing", "completed"];
            const currentIdx = lifecycleSteps.indexOf(project.lifecycleStatus || "request");
            const isComplete = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={step} className="flex-1 flex items-center">
                <div className={`w-full h-2 rounded-full ${isComplete ? "bg-violet-500" : "bg-gray-200"} ${isCurrent ? "ring-2 ring-violet-300" : ""}`} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          {["Request", "Inquiry", "Project", "Requirements", "Quote", "Scope", "Invoice", "Payment", "Execute", "Complete"].map((label, i) => (
            <span key={label} className="text-[10px] text-gray-400 w-full text-center">{label}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? "border-violet-600 text-violet-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Budget", value: `${fin.currency} ${fin.quotedAmount.toLocaleString()}`, icon: <DollarSign className="w-5 h-5 text-green-500" /> },
              { label: "Paid", value: `${fin.currency} ${fin.paidAmount.toLocaleString()}`, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
              { label: "Outstanding", value: `${fin.currency} ${fin.outstandingAmount.toLocaleString()}`, icon: <AlertCircle className="w-5 h-5 text-amber-500" /> },
              { label: "Progress", value: `${project.progress || 0}%`, icon: <TrendingUp className="w-5 h-5 text-violet-500" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  {stat.icon}
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
              <div className="flex flex-wrap gap-2">
                {["planning", "in-progress", "review", "testing", "completed", "on-hold"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      project.status === s
                        ? "bg-violet-100 border-violet-300 text-violet-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {STATUS_CONFIG[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{project.projectType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="capitalize">{project.priority}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Client</span><span>{project.clientRef?.name || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">PM</span><span>{project.projectManager?.name || "Unassigned"}</span></div>
                {project.deadline && <div className="flex justify-between"><span className="text-gray-500">Deadline</span><span>{new Date(project.deadline).toLocaleDateString()}</span></div>}
              </div>
            </div>
          </div>

          {/* Stages Preview */}
          {project.stages?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Stages ({project.stages.length})</h3>
                <button onClick={() => setActiveTab("stages")} className="text-sm text-violet-600 hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {project.stages.slice(0, 4).map((stage) => (
                  <div key={stage._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className="text-xs text-gray-400 w-6">{stage.order}</span>
                    <span className="flex-1 text-sm font-medium">{stage.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STAGE_STATUS_COLORS[stage.status] || ""}`}>{stage.status}</span>
                    <span className="text-xs text-gray-400">{stage.tasks?.length || 0} tasks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stages Tab */}
      {activeTab === "stages" && (
        <div className="space-y-4">
          {project.stages?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No stages generated yet</p>
              <button
                onClick={generateStages}
                disabled={generatingStages}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 mx-auto"
              >
                {generatingStages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                Generate Stages with AI
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {project.stages.map((stage) => {
                const completedTasks = stage.tasks?.filter((t) => t.status === "done").length || 0;
                const totalTasks = stage.tasks?.length || 0;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return (
                  <div key={stage._id} className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Stage {stage.order}</span>
                          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STAGE_STATUS_COLORS[stage.status] || ""}`}>
                          {stage.status}
                        </span>
                        {stage.status === "pending" && (
                          <button
                            onClick={() => updateStageStatus(stage._id, "active")}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Start
                          </button>
                        )}
                        {stage.status === "active" && (
                          <button
                            onClick={() => updateStageStatus(stage._id, "under-review")}
                            className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          >
                            Submit Review
                          </button>
                        )}
                        {stage.status === "under-review" && (
                          <button
                            onClick={() => updateStageStatus(stage._id, "completed")}
                            className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{completedTasks}/{totalTasks} tasks</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Tasks */}
                    {stage.tasks?.length > 0 && (
                      <div className="space-y-1">
                        {stage.tasks.map((task) => (
                          <div key={task._id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 text-sm">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${TASK_STATUS_COLORS[task.status] || ""}`}>
                              {task.status}
                            </span>
                            <span className="flex-1">{task.title}</span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                              task.priority === "high" ? "bg-red-100 text-red-600" :
                              task.priority === "medium" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                            }`}>
                              {task.priority}
                            </span>
                            {task.estimatedHours && <span className="text-xs text-gray-400">{task.estimatedHours}h</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Acceptance Criteria */}
                    {stage.acceptanceCriteria?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Acceptance Criteria</p>
                        {stage.acceptanceCriteria.map((ac, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                            <Check className="w-3 h-3 text-emerald-500" />
                            {ac}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Requirements Tab */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          {project.requirements?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No requirements yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {project.requirements.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{req.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{req.category}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          req.priority === "must-have" ? "bg-red-100 text-red-700" :
                          req.priority === "should-have" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          req.scope === "in-scope" ? "bg-emerald-100 text-emerald-700" :
                          req.scope === "out-of-scope" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {req.scope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{req.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{req.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Financials Tab */}
      {activeTab === "financials" && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Quoted Amount", value: fin.quotedAmount, color: "text-blue-600" },
              { label: "Approved Amount", value: fin.approvedAmount, color: "text-violet-600" },
              { label: "Invoiced Amount", value: fin.invoicedAmount, color: "text-amber-600" },
              { label: "Paid Amount", value: fin.paidAmount, color: "text-emerald-600" },
              { label: "Outstanding", value: fin.outstandingAmount, color: "text-orange-600" },
              { label: "Overdue", value: fin.overdueAmount, color: "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>
                  {fin.currency} {item.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Quotations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quotations ({quotations.length})</h3>
            {quotations.length === 0 ? (
              <p className="text-sm text-gray-400">No quotations yet</p>
            ) : (
              <div className="space-y-2">
                {quotations.map((q) => (
                  <div key={q._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div>
                      <span className="font-medium text-sm">{q.reference}</span>
                      <span className="text-xs text-gray-500 ml-2">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        q.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                        q.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{q.status}</span>
                      <span className="font-medium text-sm">{q.currency} {q.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Invoices ({invoices.length})</h3>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-400">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div>
                      <span className="font-medium text-sm">{inv.invoiceNumber}</span>
                      <span className="text-xs text-gray-500 ml-2">{inv.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        inv.status === "overdue" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{inv.status}</span>
                      <span className="text-sm">{inv.currency} {inv.total.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payments ({payments.length})</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div>
                      <span className="font-medium text-sm">{p.currency} {p.amount.toLocaleString()}</span>
                      <span className="text-xs text-gray-500 ml-2 capitalize">{p.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 capitalize">{p.method || "N/A"}</span>
                      <span className="text-xs text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Requests Tab */}
      {activeTab === "changes" && (
        <div className="space-y-4">
          {project.changeRequests?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No change requests</p>
            </div>
          ) : (
            project.changeRequests.map((cr) => (
              <div key={cr._id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cr.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{cr.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="capitalize">{cr.type}</span>
                      <span>by {cr.requestedBy?.name || "Unknown"}</span>
                      <span>{new Date(cr.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    cr.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    cr.status === "rejected" ? "bg-red-100 text-red-700" :
                    cr.status === "implemented" ? "bg-violet-100 text-violet-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{cr.status}</span>
                </div>
                {(cr.estimatedCost || cr.estimatedDays) && (
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    {cr.estimatedCost && <span>Est. Cost: {fin.currency} {cr.estimatedCost.toLocaleString()}</span>}
                    {cr.estimatedDays && <span>Est. Days: {cr.estimatedDays}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Activity Log ({activities.length})</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400">No activity recorded</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act._id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900">{act.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {act.actor?.name || act.actorType} &middot; {new Date(act.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
