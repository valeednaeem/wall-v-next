/**
 * General Settings → Voice Agent Configuration (UI lifecycle tests).
 *
 * Guards:
 * - Section name + both provider options visible for the settings page
 * - Selecting Vapi reveals the full Vapi control set even when the SAVED
 *   provider is Dograh (regression: checklist/webhook were keyed to saved state)
 * - Masked public-key input with show/hide; NO webhook-secret input ever
 * - Save validation blocks an unconfigured Vapi selection
 * - Save persists provider + public key through the settings API (PUT body)
 * - Dograh controls remain intact
 */
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import GeneralSettingsPage from "@/app/dashboard/settings/page";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/editor/html-editor", () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="html-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const generalSettingsResponse = {
  success: true,
  data: {
    site: { siteName: "Wall-V", siteDescription: "", siteUrl: "https://wall-v.com", logo: "", favicon: "" },
    seo: { metaTitle: "", metaDescription: "", ogImage: "", googleSearchConsole: "" },
    voice: {
      enabled: true,
      provider: "dograh",
      widgetUrl: "https://app.dograh.com/embed/dograh-widget.js?token=abc123",
      agentId: "",
      vapiAssistantId: "asst_saved_123",
      vapiPublicKey: "",
      vapiFirstMessage: "Hello",
      position: "bottom-left",
      buttonColor: "#7c3aed",
      buttonText: "Talk to AI",
      allowedDomains: [],
      systemPrompt: "Prompt",
    },
    contact: {},
  },
};

function voiceStatusResponse(overrides: { publicKeyConfigured?: boolean } = {}) {
  return {
    success: true,
    data: {
      provider: "dograh",
      enabled: true,
      dograh: { widgetUrlConfigured: true, widgetUrlError: "", apiUrlConfigured: true, webhookSecretConfigured: true },
      vapi: {
        publicKeyConfigured: overrides.publicKeyConfigured ?? true,
        assistantIdConfigured: true,
        webhookSecretConfigured: true,
        serverUrl: "https://wall-v.com",
        webhookUrl: "https://wall-v.com/api/webhooks/vapi",
        configured: (overrides.publicKeyConfigured ?? true) && true,
      },
    },
  };
}

type FetchCall = [string, RequestInit?];

let fetchMock: jest.Mock;

function setupFetch(statusResponse: ReturnType<typeof voiceStatusResponse> = voiceStatusResponse()) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.includes("/api/voice/status")) {
      return Promise.resolve({ ok: true, status: 200, json: async () => statusResponse });
    }
    if (url.includes("/api/settings/general")) {
      if (init?.method === "PUT") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => generalSettingsResponse });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

async function renderVoiceTab() {
  render(<GeneralSettingsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Voice Agent" }));
  // Wait for /api/voice/status to resolve — the indicator only renders with it.
  await screen.findByText(/Active provider \(saved\)/);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  setupFetch();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("General Settings → Voice Agent Configuration", () => {
  it("shows the section with both provider options and Dograh controls by default", async () => {
    await renderVoiceTab();

    expect(screen.getByRole("heading", { name: "Voice Agent Configuration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dograh Agent/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vapi Voice Agent/ })).toBeInTheDocument();

    // Saved provider is Dograh → Dograh controls visible, Vapi controls hidden.
    expect(screen.getByText("Widget Script URL")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Public key from the Vapi Dashboard")).toBeNull();
    expect(screen.queryByPlaceholderText("asst_...")).toBeNull();
  });

  it("reveals the full Vapi control set when Vapi is selected (saved provider still Dograh)", async () => {
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));

    // Configuration status badge + card
    expect(screen.getByRole("heading", { name: "Vapi Voice Agent" })).toBeInTheDocument();
    expect(screen.getAllByText("Configured").length).toBeGreaterThanOrEqual(1);

    // Public API key (masked) + Assistant ID
    const keyInput = screen.getByPlaceholderText(
      "Public key from the Vapi Dashboard"
    ) as HTMLInputElement;
    expect(keyInput.type).toBe("password");
    expect(screen.getByPlaceholderText("asst_...")).toBeInTheDocument();

    // Webhook endpoint (read-only) + webhook auth status (no secret)
    const endpoint = screen.getByDisplayValue("https://wall-v.com/api/webhooks/vapi") as HTMLInputElement;
    expect(endpoint.readOnly).toBe(true);
    expect(screen.getAllByText("VAPI_WEBHOOK_SECRET").length).toBeGreaterThanOrEqual(1);

    // Health checklist keyed to the SELECTED provider (regression guard)
    expect(
      screen.getByText("Public API key (entered below or NEXT_PUBLIC_VAPI_PUBLIC_KEY)")
    ).toBeInTheDocument();
    expect(screen.getByText(/Webhook URL:/)).toBeInTheDocument();
    expect(screen.getByText("https://wall-v.com/api/webhooks/vapi")).toBeInTheDocument();

    // Dograh controls hidden while Vapi is selected (single-provider UI)
    expect(screen.queryByPlaceholderText("Paste the URL copied from Dograh Agent Settings")).toBeNull();
  });

  it("never renders a webhook-secret input; the secret stays server-side", async () => {
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));

    document.querySelectorAll("input").forEach((input) => {
      const haystack = [
        input.getAttribute("placeholder"),
        input.getAttribute("aria-label"),
        input.getAttribute("name"),
      ]
        .filter(Boolean)
        .join(" ");
      expect(haystack.toLowerCase()).not.toContain("webhook secret");
      expect(haystack.toLowerCase()).not.toContain("vapi_webhook_secret");
    });

    // Only the explanatory server-side note mentions the secret.
    expect(screen.getByText(/Server-side only via the/)).toBeInTheDocument();
  });

  it("shows the active (saved) provider indicator and the pending-selection note", async () => {
    await renderVoiceTab();

    const indicator = screen.getByText(/Active provider \(saved\)/);
    expect(indicator.textContent).toContain("Dograh Agent");

    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));
    expect(screen.getByText(/selected: Vapi Voice Agent \(applies when you save\)/)).toBeInTheDocument();
  });

  it("masks and reveals the public API key on toggle", async () => {
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));

    const input = screen.getByPlaceholderText("Public key from the Vapi Dashboard") as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = input.parentElement!.querySelector("button")!;
    fireEvent.click(toggle);
    expect((screen.getByPlaceholderText("Public key from the Vapi Dashboard") as HTMLInputElement).type).toBe(
      "text"
    );
  });

  it("blocks saving Vapi when no public key is configured", async () => {
    setupFetch(voiceStatusResponse({ publicKeyConfigured: false }));
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(
      await screen.findByText(/Vapi is selected but no Public API Key is configured/)
    ).toBeInTheDocument();
    const putCall = (fetchMock.mock.calls as FetchCall[]).find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeUndefined();
  });

  it("persists provider + public key through the settings PUT API", async () => {
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));

    const keyInput = screen.getByPlaceholderText("Public key from the Vapi Dashboard");
    fireEvent.change(keyInput, { target: { value: "pk_ui_saved_value" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));

    await screen.findByText("Settings saved successfully");

    const putCall = (fetchMock.mock.calls as FetchCall[]).find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    const body = JSON.parse(putCall![1]!.body as string) as {
      voice: { provider: string; vapiPublicKey: string; vapiAssistantId: string };
    };
    expect(body.voice.provider).toBe("vapi");
    expect(body.voice.vapiPublicKey).toBe("pk_ui_saved_value");
    expect(body.voice.vapiAssistantId).toBe("asst_saved_123");
  });

  it("validates configuration for the SELECTED provider via Test configuration", async () => {
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));

    fireEvent.click(screen.getByRole("button", { name: /Test configuration/ }));

    expect(await screen.findByText("Vapi configuration looks complete.")).toBeInTheDocument();
  });

  it("keeps Dograh controls intact after switching back", async () => {
    await renderVoiceTab();
    fireEvent.click(screen.getByRole("button", { name: /Vapi Voice Agent/ }));
    fireEvent.click(screen.getByRole("button", { name: /Dograh Agent/ }));

    expect(screen.getByText("Widget Script URL")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://app.dograh.com/embed/dograh-widget.js?token=abc123")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Public key from the Vapi Dashboard")).toBeNull();
  });
});
