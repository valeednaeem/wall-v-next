/**
 * PM Financial Tracking — billing, invoicing, budget management, and cost tracking.
 *
 * Features:
 * - Project budget tracking (planned vs actual)
 * - Invoice status monitoring
 * - Revenue and cost analysis
 * - Budget alerts (over-budget, at-risk)
 * - Payment tracking
 * - Financial health per project
 */

import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";
import Invoice from "@/models/invoice";
import Billing from "@/models/billing";
import Task from "@/models/task";
import PmAlert from "@/models/pm-alert";
import PmAuditLog from "@/models/pm-audit-log";

export interface ProjectFinancial {
  projectId: string;
  projectName: string;
  clientName: string;
  budget: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  status: "under-budget" | "on-budget" | "at-risk" | "over-budget";
  invoices: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  };
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  averageInvoiceValue: number;
  totalProjects: number;
  projectsOverBudget: number;
  projectsAtRisk: number;
  monthlyRevenue: { month: string; amount: number }[];
  topProjects: { name: string; budget: number; spent: number; utilization: number }[];
}

export interface BudgetAlert {
  projectId: string;
  projectName: string;
  budget: number;
  spent: number;
  utilizationPercent: number;
  severity: "warning" | "critical";
  message: string;
}

/**
 * Get financial data for a specific project.
 */
export async function getProjectFinancials(projectId: string): Promise<ProjectFinancial> {
  await connectToDatabase();

  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error("Project not found");

  const p = project as any;
  const budget = p.budget || 0;

  // Get invoices for this project
  const invoices = await Invoice.find({ project: projectId }).lean();
  const inv = invoices as any[];

  const totalInvoices = inv.length;
  const paidInvoices = inv.filter((i) => i.status === "paid").length;
  const pendingInvoices = inv.filter((i) => ["sent", "viewed", "draft"].includes(i.status)).length;
  const overdueInvoices = inv.filter((i) => i.status === "overdue").length;

  const totalAmount = inv.reduce((sum, i) => sum + (i.total || 0), 0);
  const paidAmount = inv.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingAmount = inv.filter((i) => ["sent", "viewed", "draft"].includes(i.status)).reduce((sum, i) => sum + (i.total || 0), 0);
  const overdueAmount = inv.filter((i) => i.status === "overdue").reduce((sum, i) => sum + (i.total || 0), 0);

  // Calculate costs from tasks (time-based estimation)
  const tasks = await Task.find({ project: projectId }).lean();
  const estimatedCost = tasks.length * 500; // rough estimate per task

  const spent = Math.max(paidAmount, estimatedCost);
  const remaining = budget > 0 ? budget - spent : 0;
  const utilizationPercent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  let status: ProjectFinancial["status"] = "under-budget";
  if (budget > 0) {
    if (utilizationPercent > 100) status = "over-budget";
    else if (utilizationPercent > 85) status = "at-risk";
    else if (utilizationPercent > 70) status = "on-budget";
  }

  const revenue = paidAmount;
  const profit = revenue - spent;
  const profitMargin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  let clientName = "Unknown";
  if (p.client) {
    const Client = (await import("@/models/client")).default;
    const client = await Client.findById(p.client).lean();
    if (client) clientName = (client as any).name || "Unknown";
  }

  return {
    projectId: p._id.toString(),
    projectName: p.name,
    clientName,
    budget,
    spent,
    remaining,
    utilizationPercent,
    status,
    invoices: {
      total: totalInvoices,
      paid: paidInvoices,
      pending: pendingInvoices,
      overdue: overdueInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
    },
    revenue,
    profit,
    profitMargin,
  };
}

/**
 * Get overall financial summary.
 */
export async function getFinancialSummary(): Promise<FinancialSummary> {
  await connectToDatabase();

  // Invoice aggregation
  const invoices = await Invoice.find().lean();
  const inv = invoices as any[];

  const totalPaid = inv.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPending = inv.filter((i) => ["sent", "viewed", "draft"].includes(i.status)).reduce((sum, i) => sum + (i.total || 0), 0);
  const totalOverdue = inv.filter((i) => i.status === "overdue").reduce((sum, i) => sum + (i.total || 0), 0);
  const totalRevenue = totalPaid + totalPending;
  const averageInvoiceValue = inv.length > 0 ? Math.round(totalRevenue / inv.length) : 0;

  // Project budget tracking
  const projects = await Project.find().lean();
  let projectsOverBudget = 0;
  let projectsAtRisk = 0;
  const topProjects: FinancialSummary["topProjects"] = [];

  for (const project of projects) {
    const p = project as any;
    const budget = p.budget || 0;
    if (budget <= 0) continue;

    const projectInvoices = inv.filter((i) => i.project?.toString() === p._id.toString());
    const spent = projectInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    const utilization = Math.round((spent / budget) * 100);

    if (utilization > 100) projectsOverBudget++;
    else if (utilization > 85) projectsAtRisk++;

    topProjects.push({ name: p.name, budget, spent, utilization });
  }

  topProjects.sort((a, b) => b.utilization - a.utilization);

  // Monthly revenue (last 6 months)
  const monthlyRevenue: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const monthPaid = inv
      .filter((x: any) => x.status === "paid" && new Date(x.paidAt || x.updatedAt) >= monthStart && new Date(x.paidAt || x.updatedAt) <= monthEnd)
      .reduce((sum: number, x: any) => sum + (x.total || 0), 0);

    monthlyRevenue.push({ month: monthStr, amount: monthPaid });
  }

  return {
    totalRevenue,
    totalPending,
    totalOverdue,
    totalPaid,
    averageInvoiceValue,
    totalProjects: projects.length,
    projectsOverBudget,
    projectsAtRisk,
    monthlyRevenue,
    topProjects: topProjects.slice(0, 10),
  };
}

/**
 * Check for budget alerts across all projects.
 */
export async function checkBudgetAlerts(): Promise<BudgetAlert[]> {
  await connectToDatabase();

  const projects = await Project.find({ budget: { $gt: 0 } }).lean();
  const alerts: BudgetAlert[] = [];

  const invoices = await Invoice.find().lean();
  const inv = invoices as any[];

  for (const project of projects) {
    const p = project as any;
    const budget = p.budget;

    const projectInvoices = inv.filter((i) => i.project?.toString() === p._id.toString());
    const spent = projectInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    const utilization = Math.round((spent / budget) * 100);

    if (utilization > 100) {
      alerts.push({
        projectId: p._id.toString(),
        projectName: p.name,
        budget,
        spent,
        utilizationPercent: utilization,
        severity: "critical",
        message: `Project "${p.name}" is ${utilization - 100}% over budget`,
      });
    } else if (utilization > 85) {
      alerts.push({
        projectId: p._id.toString(),
        projectName: p.name,
        budget,
        spent,
        utilizationPercent: utilization,
        severity: "warning",
        message: `Project "${p.name}" is at ${utilization}% budget utilization`,
      });
    }
  }

  return alerts;
}

/**
 * Generate budget alert in PM system.
 */
export async function generateBudgetAlerts(): Promise<{ created: number }> {
  const budgetAlerts = await checkBudgetAlerts();
  let created = 0;

  for (const alert of budgetAlerts) {
    const existing = await PmAlert.findOne({
      title: `Budget Alert: ${alert.projectName}`,
      status: "active",
    }).lean();

    if (!existing) {
      await PmAlert.create({
        title: `Budget Alert: ${alert.projectName}`,
        message: alert.message,
        category: "billing",
        severity: alert.severity === "critical" ? "critical" : "warning",
        status: "active",
        source: "automated-check",
        actionRequired: true,
        resource: alert.projectId,
        resourceType: "agent",
      });
      created++;
    }
  }

  return { created };
}
