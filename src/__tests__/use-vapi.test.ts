import { renderHook, act, cleanup } from "@testing-library/react";
import {
  useVapi,
  resetSharedVapiInstance,
  parseTranscriptMessage,
  describeVapiError,
} from "@/components/ai/use-vapi";

// ─── SDK mock ─────────────────────────────────────────────────────────────────
// A single fake Vapi class is defined inside the jest.mock factory (required
// for hoisting) and re-exposed through the mocked module for assertions.
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

    listenerCount(event: string) {
      return this.listeners.get(event)?.size ?? 0;
    }

    emit(event: string, ...args: unknown[]) {
      this.listeners.get(event)?.forEach((listener) => listener(...args));
    }
  }

  return { __esModule: true, default: FakeVapi };
});

interface FakeVapiInstance {
  token: string;
  start: jest.Mock;
  stop: jest.Mock;
  listenerCount(event: string): number;
  emit(event: string, ...args: unknown[]): void;
  removeAllListeners(): void;
}

function getVapiClass(): { instances: FakeVapiInstance[] } {
  return jest.requireMock("@vapi-ai/web").default;
}

function instance(): FakeVapiInstance {
  const instances = getVapiClass().instances;
  return instances[instances.length - 1];
}

const ASSISTANT_ID = "asst_wallv_test";

describe("useVapi", () => {
  const originalPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "pk_test_wallv";
  });

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "pk_test_wallv";
    getVapiClass().instances.length = 0;
    resetSharedVapiInstance();
  });

  afterEach(() => {
    cleanup();
    resetSharedVapiInstance();
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalPublicKey === undefined) delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = originalPublicKey;
  });

  it("creates exactly one shared SDK instance across multiple mounts", () => {
    const a = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));
    const b = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    expect(getVapiClass().instances).toHaveLength(1);
    expect(instance().token).toBe("pk_test_wallv");
    expect(a.result.current.scriptLoaded).toBe(true);
    expect(b.result.current.scriptLoaded).toBe(true);
  });

  it("reports unconfigured state instead of starting", async () => {
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "";
    const { result } = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    expect(result.current.scriptLoaded).toBe(false);
    expect(result.current.scriptError).toMatch(/not configured/i);

    await act(async () => {
      await result.current.startCall();
    });
    expect(getVapiClass().instances).toHaveLength(0);
    expect(result.current.status).toBe("idle");
  });

  it("passes context variables and metadata on start", async () => {
    const { result } = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    await act(async () => {
      await result.current.startCall({
        client_name: "Ali",
        client_email: "ali@example.com",
      });
    });

    expect(result.current.status).toBe("connecting");
    expect(instance().start).toHaveBeenCalledTimes(1);

    const [assistantId, overrides] = instance().start.mock.calls[0];
    expect(assistantId).toBe(ASSISTANT_ID);
    expect(overrides.variableValues.client_name).toBe("Ali");
    expect(overrides.variableValues.client_email).toBe("ali@example.com");
    expect(overrides.variableValues.page_url).toBeTruthy();
    expect(overrides.variableValues.current_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(overrides.metadata.source).toBe("wall-v-website");
  });

  it("ignores duplicate start requests while a call is live", async () => {
    const { result } = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    await act(async () => {
      await Promise.all([
        result.current.startCall(),
        result.current.startCall(),
        result.current.startCall(),
      ]);
    });

    expect(instance().start).toHaveBeenCalledTimes(1);
  });

  it("walks the documented lifecycle states", async () => {
    const statuses: string[] = [];
    const { result } = renderHook(() =>
      useVapi({
        assistantId: ASSISTANT_ID,
        onStatusChange: (status) => statuses.push(status),
      })
    );

    await act(async () => {
      await result.current.startCall();
    });
    expect(result.current.status).toBe("connecting");

    act(() => instance().emit("call-start"));
    expect(result.current.status).toBe("connected");

    act(() => instance().emit("speech-start"));
    expect(result.current.status).toBe("speaking");

    act(() => instance().emit("speech-end"));
    expect(result.current.status).toBe("listening");

    act(() => instance().emit("call-end"));
    expect(result.current.status).toBe("ended");

    // Auto-return to a clean idle state so a second call can start.
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.status).toBe("idle");
    expect(statuses).toEqual(
      expect.arrayContaining(["connecting", "connected", "speaking", "listening", "ended", "idle"])
    );
  });

  it("reports call-connected with assistant and call IDs", async () => {
    const onCallConnected = jest.fn();
    renderHook(() => useVapi({ assistantId: ASSISTANT_ID, onCallConnected }));

    act(() => instance().emit("call-start-success", { callId: "call_42" }));

    expect(onCallConnected).toHaveBeenCalledWith({
      assistantId: ASSISTANT_ID,
      callId: "call_42",
    });
  });

  it("reports duration and call context on call end", async () => {
    const onCallDisconnected = jest.fn();
    const { result } = renderHook(() =>
      useVapi({ assistantId: ASSISTANT_ID, onCallDisconnected })
    );

    await act(async () => {
      await result.current.startCall();
    });
    act(() => instance().emit("call-start"));

    act(() => instance().emit("call-end"));

    expect(onCallDisconnected).toHaveBeenCalledTimes(1);
    const payload = onCallDisconnected.mock.calls[0][0];
    expect(payload.assistantId).toBe(ASSISTANT_ID);
    expect(typeof payload.durationSeconds).toBe("number");
    expect(result.current.status).toBe("ended");
  });

  it("handles transcripts by role, replaces partials, and ignores other messages", async () => {
    const onTranscript = jest.fn();
    const { result } = renderHook(() =>
      useVapi({ assistantId: ASSISTANT_ID, onTranscript })
    );

    act(() => {
      instance().emit("message", {
        type: "transcript",
        role: "user",
        transcript: "hel",
        transcriptType: "partial",
      });
      instance().emit("message", {
        type: "transcript",
        role: "user",
        transcript: "hello there",
        transcriptType: "final",
      });
    });

    expect(result.current.transcripts).toHaveLength(1);
    expect(result.current.transcripts[0]).toMatchObject({
      role: "user",
      text: "hello there",
      final: true,
    });

    act(() => {
      instance().emit("message", {
        type: "transcript",
        role: "assistant",
        transcript: "Hi! How can I help?",
        transcriptType: "final",
      });
      // Non-transcript client messages must be ignored entirely.
      instance().emit("message", { type: "speech-update", status: "started", role: "assistant" });
      instance().emit("message", { type: "metadata", metadata: "ping" });
      instance().emit("message", null);
    });

    expect(result.current.transcripts).toHaveLength(2);
    expect(result.current.transcripts[1].role).toBe("assistant");
    // Fired for each parsed transcript: user partial, user final, assistant final.
    expect(onTranscript).toHaveBeenCalledTimes(3);
  });

  it("surfaces SDK errors with credentials redacted", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useVapi({ assistantId: ASSISTANT_ID, onError })
    );

    act(() => {
      instance().emit("error", new Error("Unauthorized Bearer abc123secrettoken pk_live_supersecret"));
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/\[redacted\]/);
    expect(result.current.error).not.toContain("abc123secrettoken");
    expect(result.current.error).not.toContain("pk_live_supersecret");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("prevents ending when no call is active", () => {
    const { result } = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    act(() => result.current.endCall());
    expect(result.current.status).toBe("idle");
    expect(instance().stop).not.toHaveBeenCalled();
  });

  it("stops the call on endCall while live", async () => {
    const { result } = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    await act(async () => {
      await result.current.startCall();
    });
    act(() => instance().emit("call-start"));

    act(() => result.current.endCall());
    expect(result.current.status).toBe("ending");
    expect(instance().stop).toHaveBeenCalledTimes(1);
  });

  it("removes every SDK listener on unmount (no duplicate listeners)", async () => {
    const { result, unmount } = renderHook(() =>
      useVapi({ assistantId: ASSISTANT_ID })
    );
    await act(async () => {
      await result.current.startCall();
    });

    const tracked = ["call-start", "call-end", "message", "error", "speech-start", "speech-end"];
    tracked.forEach((event) => expect(instance().listenerCount(event)).toBe(1));

    unmount();
    tracked.forEach((event) => expect(instance().listenerCount(event)).toBe(0));
  });

  it("can start a second call after the first ends", async () => {
    const { result } = renderHook(() => useVapi({ assistantId: ASSISTANT_ID }));

    await act(async () => {
      await result.current.startCall();
    });
    act(() => instance().emit("call-start"));
    act(() => instance().emit("call-end"));
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.startCall();
    });
    expect(instance().start).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("connecting");
  });
});

describe("parseTranscriptMessage", () => {
  it("accepts transcript types and rejects everything else", () => {
    expect(
      parseTranscriptMessage({
        type: 'transcript[transcriptType="final"]',
        role: "assistant",
        transcript: "done",
        transcriptType: "final",
      })
    ).toMatchObject({ role: "assistant", text: "done", final: true });

    expect(parseTranscriptMessage({ type: "hang" })).toBeNull();
    expect(parseTranscriptMessage({ type: "transcript", role: "system", transcript: "x" })).toBeNull();
    expect(parseTranscriptMessage({ type: "transcript", role: "user", transcript: "   " })).toBeNull();
    expect(parseTranscriptMessage(undefined)).toBeNull();
  });
});

describe("describeVapiError", () => {
  it("never returns raw credentials", () => {
    expect(describeVapiError(new Error("Bearer topsecrettoken"))).toBe("Bearer [redacted]");
    expect(describeVapiError("failed with pk_abcdef1234567890")).toBe("failed with [redacted]");
    expect(describeVapiError(undefined)).toMatch(/voice call failed/i);
  });
});
