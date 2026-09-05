import {
  approvePlan,
  rejectPlan,
  requestPlanChanges,
  executePlan,
} from "@/lib/content-orchestrator";

const mockLeanReturn = (data: Record<string, unknown>) => ({
  lean: jest.fn().mockResolvedValue(data),
});

jest.mock("@/models/content-plan", () => {
  const mock = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };
  return { __esModule: true, default: mock };
});

jest.mock("@/models/content-item", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) }),
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ _id: "item123" }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("@/models/content-distribution", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({ _id: "dist123" }),
  },
}));

jest.mock("@/models/content-settings", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("@/models/content-topic", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ _id: "topic123" }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("@/models/blog-post", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: "blog123", slug: "test-article" }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("@/models/blog-category", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: "cat123", name: "AI Insights" }),
  },
}));

jest.mock("@/models/blog-tag", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: "tag123" }),
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  },
}));

jest.mock("@/models/user", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "admin1", name: "Admin" }) }),
  },
}));

jest.mock("@/models/content-asset", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/content-metric", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/content-campaign", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "camp123",
        status: "pending_approval",
        contentPillars: [],
        productServicePriorities: [],
      }),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

describe("Content Orchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("approvePlan", () => {
    it("approves a plan in pending_approval status", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", campaign: "camp123", status: "pending_approval" })
      );
      (ContentPlan.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "approved" })
      );

      const result = await approvePlan("plan123", "user123");
      expect(result.status).toBe("approved");
    });

    it("throws on plan not in approvable status", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "executing" })
      );

      await expect(approvePlan("plan123", "user123")).rejects.toThrow(
        'Cannot approve plan in status "executing"'
      );
    });
  });

  describe("rejectPlan", () => {
    it("rejects a plan with a reason", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", campaign: "camp123", status: "pending_approval" })
      );
      (ContentPlan.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "cancelled" })
      );

      const result = await rejectPlan("plan123", "user123", "Needs more research");
      expect(result.status).toBe("cancelled");
    });

    it("throws on plan not in rejectable status", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "completed" })
      );

      await expect(rejectPlan("plan123", "user123", "reason")).rejects.toThrow(
        'Cannot reject plan in status "completed"'
      );
    });
  });

  describe("requestPlanChanges", () => {
    it("requests changes on an approved plan", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", campaign: "camp123", status: "approved" })
      );
      (ContentPlan.findByIdAndUpdate as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "changes_requested" })
      );

      const result = await requestPlanChanges("plan123", "user123", "Add more keywords");
      expect(result.status).toBe("changes_requested");
    });

    it("throws on plan not in changeable status", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "executing" })
      );

      await expect(
        requestPlanChanges("plan123", "user123", "message")
      ).rejects.toThrow('Cannot request changes on plan in status "executing"');
    });
  });

  describe("executePlan", () => {
    it("throws if plan is not approved", async () => {
      const { default: ContentPlan } = await import("@/models/content-plan");
      (ContentPlan.findById as jest.Mock).mockReturnValue(
        mockLeanReturn({ _id: "plan123", status: "pending_approval", topics: [] })
      );

      await expect(executePlan("plan123")).rejects.toThrow(
        "Plan must be approved before execution"
      );
    });
  });
});
