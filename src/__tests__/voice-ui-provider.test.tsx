/**
 * S3.4 — voice UI provider integration.
 *
 * Verifies the provider flag (D1) wiring in the real voice components:
 *  - provider "vapi"  → the Vapi SDK path is used (start/end through useVapi)
 *  - provider "dograh" → NO Vapi instance is ever created (rollback intact)
 *
 * Visual design and the Dograh code path are intentionally untouched; these
 * tests only prove which execution path each provider selects.
 */
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { InlineVoicePanel } from "@/components/ai/inline-voice-panel";
import { FloatingVoiceWidget } from "@/components/ai/voice-widget";
import { resetSharedVapiInstance } from "@/components/ai/use-vapi";

// ─── SDK mock (same pattern as use-vapi.test.ts) ──────────────────────────────
jest.mock("@vapi-ai/web", () => {
  type Listener = (...args: unknown[]) => void;

  class FakeVapi {
    static instances: FakeVapi[] = [];

    start = jest.fn().mockResolvedValue({ id: "call_test" });
    stop = jest.fn().mockResolvedValue(undefined);

    private listeners = new Map<string, Set<Listener>>();

    constructor(public token: string) {
      FakeVapi.instances.push(this);
    }

    on(event: string, listener: Listener) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(listener);
      return this;
    }

    removeListener(event: string, listener: Listener) {
      this.listeners.get(event)?.delete(listener);
      return this;
    }

    removeAllListeners() {
      this.listeners.clear();
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      this.listeners.get(event)?.forEach((listener) => listener(...args));
    }
  }

  return { __esModule: true, default: FakeVapi };
});

// FloatingVoiceWidget uses usePathname for its /voice-agent runtime ownership check.
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

interface FakeVapiInstance {
  token: string;
  start: jest.Mock;
  stop: jest.Mock;
  emit(event: string, ...args: unknown[]): void;
}

function getVapiClass(): { instances: FakeVapiInstance[] } {
  return jest.requireMock("@vapi-ai/web").default;
}

function lastInstance(): FakeVapiInstance {
  const instances = getVapiClass().instances;
  return instances[instances.length - 1];
}

function mockSettings(voice: Record<string, unknown>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { voice } }),
  }) as unknown as typeof fetch;
}

const BASE_VOICE = {
  enabled: true,
  widgetUrl: "",
  agentId: "dograh_agent_kept_for_rollback",
  position: "bottom-left",
  buttonColor: "#7c3aed",
  buttonText: "Talk to AI",
  systemPrompt: "You are Wall-V's assistant.",
};

describe("voice UI provider integration (S3.4)", () => {
  const originalPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "pk_test_ui";
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "pk_test_ui";
    getVapiClass().instances.length = 0;
    resetSharedVapiInstance();
  });

  afterEach(() => {
    cleanup();
    resetSharedVapiInstance();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalPublicKey === undefined) delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = originalPublicKey;
    delete (global as { fetch?: unknown }).fetch;
  });

  describe("InlineVoicePanel", () => {
    it("provider=vapi: starts exactly one Vapi call with the assistant ID + prompt context", async () => {
      mockSettings({ ...BASE_VOICE, provider: "vapi", vapiAssistantId: "asst_ui_test" });

      render(<InlineVoicePanel />);

      const startButton = await screen.findByRole("button", { name: /start voice call/i });
      expect(getVapiClass().instances).toHaveLength(1);
      expect(lastInstance().token).toBe("pk_test_ui");

      fireEvent.click(startButton);
      await waitFor(() => expect(lastInstance().start).toHaveBeenCalledTimes(1));

      const [assistantId, overrides] = lastInstance().start.mock.calls[0];
      expect(assistantId).toBe("asst_ui_test");
      expect(overrides.variableValues.system_prompt).toBe("You are Wall-V's assistant.");
      expect(overrides.variableValues.instructions).toBe("You are Wall-V's assistant.");

      // Duplicate start is impossible: the button is disabled while connecting.
      fireEvent.click(startButton);
      expect(lastInstance().start).toHaveBeenCalledTimes(1);

      // Connected → the call can be ended.
      act(() => {
        lastInstance().emit("call-start");
      });
      const endButton = await screen.findByRole("button", { name: /end call/i });
      fireEvent.click(endButton);
      await waitFor(() => expect(lastInstance().stop).toHaveBeenCalledTimes(1));
    });

    it("provider=vapi (unconfigured assistant ID): shows a configuration error and never starts", async () => {
      mockSettings({ ...BASE_VOICE, provider: "vapi", vapiAssistantId: "" });

      render(<InlineVoicePanel />);

      // scriptError → the panel shows the explicit configuration error state.
      // findByText waits for the settings fetch to flip the provider to vapi
      // (before that, the panel briefly renders with the dograh default).
      expect(await screen.findByText(/voice agent unavailable/i)).toBeTruthy();
      expect(await screen.findByText(/assistant ID is not configured/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /start voice call/i })).toBeNull();

      // No SDK instance is created and nothing can ever start.
      expect(getVapiClass().instances).toHaveLength(0);
    });

    it("provider=dograh: the Vapi SDK is never instantiated (rollback intact)", async () => {
      mockSettings({ ...BASE_VOICE, provider: "dograh" });

      render(<InlineVoicePanel />);

      // Dograh path selected (no widget URL in test env → its own error state),
      // and the Vapi SDK is never touched.
      expect(await screen.findByText(/voice agent unavailable/i)).toBeTruthy();
      await new Promise((r) => setTimeout(r, 50));

      expect(getVapiClass().instances).toHaveLength(0);
    });
  });

  describe("FloatingVoiceWidget", () => {
    it("provider=vapi: mounts the Vapi runtime and reaches the welcome flow", async () => {
      mockSettings({ ...BASE_VOICE, provider: "vapi", vapiAssistantId: "asst_ui_test" });

      render(<FloatingVoiceWidget />);

      const micButton = await screen.findByRole("button", { name: /talk to ai/i });
      expect(getVapiClass().instances).toHaveLength(1);
      expect(lastInstance().token).toBe("pk_test_ui");

      // Welcome popup opens via the floating mic button.
      fireEvent.click(micButton);
      expect(await screen.findByText(/welcome to wall-v/i)).toBeTruthy();
    });

    it("provider=dograh: never creates a Vapi instance and keeps the Dograh UI", async () => {
      mockSettings({ ...BASE_VOICE, provider: "dograh" });

      render(<FloatingVoiceWidget />);

      const micButton = await screen.findByRole("button", { name: /talk to ai/i });
      await new Promise((r) => setTimeout(r, 50));

      expect(getVapiClass().instances).toHaveLength(0);

      fireEvent.click(micButton);
      expect(await screen.findByText(/welcome to wall-v/i)).toBeTruthy();
    });
  });
});
