/**
 * Public "Talk to Agent" provider routing tests (Dograh ↔ Vapi).
 *
 * Covers brief §9 areas 5–9:
 *  5. Selecting Dograh initializes Dograh only
 *  6. Selecting Vapi initializes Vapi only
 *  7. Vapi configuration errors do NOT trigger a Dograh fallback
 *  8. Missing public key produces a clear diagnostic
 *  9. Missing assistant ID produces a clear diagnostic
 *
 * Strategy: mock the Dograh hook (assert its `enabled` gate) and mock the
 * Vapi Web SDK (assert constructor + start() arguments). Every test uses a
 * distinct public key so the `useVapi` module-level client cache cannot leak
 * constructor assertions between tests.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import Vapi from "@vapi-ai/web";
import { useDograh } from "@/components/ai/voice-agent";
import { VAPI_NOT_CONFIGURED_MESSAGE } from "@/lib/vapi-config";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Dograh hook mock ───────────────────────────────────────────────────────

jest.mock("@/components/ai/voice-agent", () => ({
  __esModule: true,
  useDograh: jest.fn(),
}));

const mockUseDograh = useDograh as unknown as jest.Mock;

interface DograhMockConfig {
  enabled?: boolean;
}

function installDograhMock() {
  mockUseDograh.mockImplementation((config: DograhMockConfig = {}) => ({
    status: "idle",
    scriptLoaded: Boolean(config.enabled),
    scriptError: null,
    containerRef: { current: null },
    startCall: jest.fn(),
    endCall: jest.fn(),
    isLive: false,
    getStatusLabel: () => "idle",
    getStatusColor: () => "bg-primary",
    duration: 0,
  }));
}

function lastDograhConfig(): DograhMockConfig {
  const calls = mockUseDograh.mock.calls;
  return calls[calls.length - 1]?.[0] ?? {};
}

// ─── Vapi Web SDK mock ──────────────────────────────────────────────────────

interface MockVapiInstance {
  on: jest.Mock;
  off: jest.Mock;
  start: jest.Mock;
  end: jest.Mock;
}

jest.mock("@vapi-ai/web", () => {
  const MockVapi = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    start: jest.fn().mockResolvedValue({ id: "call_test" }),
    end: jest.fn(),
  }));
  return { __esModule: true, default: MockVapi };
});

const vapiCtor = Vapi as unknown as jest.Mock;

function lastVapiInstance(): MockVapiInstance {
  const results = vapiCtor.mock.results;
  expect(results.length).toBeGreaterThan(0);
  const last = results[results.length - 1];
  expect(last.type).toBe("return");
  return last.value as MockVapiInstance;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

interface VoiceFixture {
  enabled?: boolean;
  provider?: "dograh" | "vapi";
  buttonText?: string;
  systemPrompt?: string;
  vapi?: Record<string, unknown>;
}

function publicResponse(voice: VoiceFixture = {}) {
  const {
    enabled = true,
    provider = "dograh",
    buttonText = "Talk to AI",
    systemPrompt = "You are the Wall-V assistant.",
    vapi = {
      assistantId: "asst_fixture_1",
      publicKey: "pk_fixture_1",
      publicKeyConfigured: true,
      assistantIdConfigured: true,
      configured: true,
      firstMessage: "Hello from Wall-V",
    },
  } = voice;
  return {
    success: true,
    data: {
      voice: {
        enabled,
        provider,
        widgetUrl: "https://app.dograh.com/embed/dograh-widget.js?token=abc123",
        agentId: "",
        position: "bottom-left",
        buttonColor: "#7c3aed",
        buttonText,
        systemPrompt,
        vapi,
      },
    },
  };
}

function installFetch(voice: VoiceFixture = {}) {
  const payload = publicResponse(voice);
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: async () => payload })
  ) as unknown as typeof fetch;
}

async function renderWidget() {
  const { VapiWidget } = await import("@/components/ai/vapi-widget");
  return render(<VapiWidget />);
}

async function renderInlinePanel() {
  const { InlineVoicePanel } = await import("@/components/ai/inline-voice-panel");
  return render(<InlineVoicePanel />);
}

async function renderFloatingWidget() {
  const { FloatingVoiceWidget } = await import("@/components/ai/voice-widget");
  return render(<FloatingVoiceWidget />);
}

beforeEach(() => {
  installDograhMock();
  vapiCtor.mockClear();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Vapi floating widget ───────────────────────────────────────────────────

describe("VapiWidget — provider gating", () => {
  it("renders nothing when Dograh is selected (Vapi never initializes)", async () => {
    installFetch({ provider: "dograh" });
    const { container } = await renderWidget();

    await waitFor(() => expect(container.firstChild).toBeNull());
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("renders nothing when voice is disabled", async () => {
    installFetch({ provider: "vapi", enabled: false });
    const { container } = await renderWidget();

    await waitFor(() => expect(container.firstChild).toBeNull());
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("initialises the Vapi SDK with the public key and starts a call with the assistant ID", async () => {
    installFetch({
      provider: "vapi",
      buttonText: "Talk to Wall-V",
      vapi: {
        assistantId: "asst_widget_start",
        publicKey: "pk_widget_start",
        publicKeyConfigured: true,
        assistantIdConfigured: true,
        configured: true,
        firstMessage: "Hi",
      },
    });
    await renderWidget();

    const button = await screen.findByRole("button", { name: "Start voice call" });
    expect(vapiCtor).toHaveBeenCalledWith("pk_widget_start");

    fireEvent.click(button);
    await waitFor(() => expect(lastVapiInstance().start).toHaveBeenCalledTimes(1));
    expect(lastVapiInstance().start).toHaveBeenCalledWith(
      "asst_widget_start",
      expect.objectContaining({ firstMessage: "Hi" })
    );
  });

  it("shows the required diagnostic when selected but the public key is missing (no Dograh fallback)", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "asst_missing_key",
        publicKey: "",
        publicKeyConfigured: false,
        assistantIdConfigured: true,
        configured: false,
        firstMessage: "",
      },
    });
    await renderWidget();

    expect(await screen.findByRole("alert")).toHaveTextContent(VAPI_NOT_CONFIGURED_MESSAGE);
    expect(screen.getByText("The Vapi Public API Key is missing.")).toBeInTheDocument();
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("shows the required diagnostic when selected but the assistant ID is missing (no Dograh fallback)", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "",
        publicKey: "pk_missing_assistant",
        publicKeyConfigured: true,
        assistantIdConfigured: false,
        configured: false,
        firstMessage: "",
      },
    });
    await renderWidget();

    expect(await screen.findByRole("alert")).toHaveTextContent(VAPI_NOT_CONFIGURED_MESSAGE);
    expect(screen.getByText("The Vapi Assistant ID is missing.")).toBeInTheDocument();
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("falls back to component-level derivation when the server 'configured' flag is absent", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "asst_legacy_shape",
        publicKey: "pk_legacy_shape",
        publicKeyConfigured: true,
        assistantIdConfigured: true,
        // no `configured` field — older cached response
        firstMessage: "",
      },
    });
    await renderWidget();

    expect(await screen.findByRole("button", { name: "Start voice call" })).toBeInTheDocument();
    expect(vapiCtor).toHaveBeenCalledWith("pk_legacy_shape");
  });
});

// ─── Inline panel (/voice-agent page) ───────────────────────────────────────

describe("InlineVoicePanel — provider routing", () => {
  it("initialises Dograh only when Dograh is selected", async () => {
    installFetch({ provider: "dograh" });
    await renderInlinePanel();

    expect(await screen.findByRole("button", { name: /Start Voice Call/ })).toBeInTheDocument();
    expect(lastDograhConfig().enabled).toBe(true);
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("initialises Vapi only when Vapi is selected — Dograh stays disabled", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "asst_inline_start",
        publicKey: "pk_inline_start",
        publicKeyConfigured: true,
        assistantIdConfigured: true,
        configured: true,
        firstMessage: "Welcome",
      },
    });
    await renderInlinePanel();

    const button = await screen.findByRole("button", { name: /Start Voice Call/ });
    expect(lastDograhConfig().enabled).toBe(false);
    expect(vapiCtor).toHaveBeenCalledWith("pk_inline_start");

    fireEvent.click(button);
    await waitFor(() => expect(lastVapiInstance().start).toHaveBeenCalledTimes(1));
    expect(lastVapiInstance().start).toHaveBeenCalledWith(
      "asst_inline_start",
      expect.objectContaining({ firstMessage: "Welcome" })
    );
  });

  it("shows the required diagnostic instead of loading Dograh when Vapi is unconfigured", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "",
        publicKey: "",
        publicKeyConfigured: false,
        assistantIdConfigured: false,
        configured: false,
        firstMessage: "",
      },
    });
    await renderInlinePanel();

    expect(await screen.findByRole("alert")).toHaveTextContent(VAPI_NOT_CONFIGURED_MESSAGE);
    expect(lastDograhConfig().enabled).toBe(false);
    expect(vapiCtor).not.toHaveBeenCalled();
    // The Dograh loading spinner must never appear for the Vapi path.
    expect(screen.queryByText("Loading voice agent…")).toBeNull();
  });

  it("keeps Dograh unavailable (not silently active) when the settings fetch fails", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("network down"))) as unknown as typeof fetch;
    await renderInlinePanel();

    // Fetch failure falls back to historical Dograh defaults.
    expect(await screen.findByRole("button", { name: /Start Voice Call/ })).toBeInTheDocument();
    expect(lastDograhConfig().enabled).toBe(true);
    expect(vapiCtor).not.toHaveBeenCalled();
  });
});

// ─── Floating widget + layout combination ───────────────────────────────────

describe("FloatingVoiceWidget — provider routing", () => {
  it("enables the Dograh runtime when Dograh is selected", async () => {
    installFetch({ provider: "dograh" });
    await renderFloatingWidget();

    await waitFor(() => expect(lastDograhConfig().enabled).toBe(true));
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("never enables the Dograh runtime when Vapi is selected", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "asst_float_guard",
        publicKey: "pk_float_guard",
        publicKeyConfigured: true,
        assistantIdConfigured: true,
        configured: true,
        firstMessage: "",
      },
    });
    const { container } = await renderFloatingWidget();

    await waitFor(() => expect(lastDograhConfig().enabled).toBe(false));
    expect(container.firstChild).toBeNull();
    expect(vapiCtor).not.toHaveBeenCalled();
  });

  it("layout combination: Vapi widget renders while the Dograh widget stays dormant", async () => {
    installFetch({
      provider: "vapi",
      vapi: {
        assistantId: "asst_layout_combo",
        publicKey: "pk_layout_combo",
        publicKeyConfigured: true,
        assistantIdConfigured: true,
        configured: true,
        firstMessage: "",
      },
    });
    const { VapiWidget } = await import("@/components/ai/vapi-widget");
    const { FloatingVoiceWidget } = await import("@/components/ai/voice-widget");
    render(
      <>
        <FloatingVoiceWidget />
        <VapiWidget />
      </>
    );

    expect(await screen.findByRole("button", { name: "Start voice call" })).toBeInTheDocument();
    expect(lastDograhConfig().enabled).toBe(false);
    expect(vapiCtor).toHaveBeenCalledWith("pk_layout_combo");
  });
});
