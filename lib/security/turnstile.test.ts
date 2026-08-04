import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TurnstileVerificationError,
  assertTurnstileTokenShape,
  verifyTurnstileToken,
} from "./turnstile";

describe("Turnstile verification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("accepts a successful response for the upload action and expected host", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, hostname: "example.com", action: "upload" }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      verifyTurnstileToken({ token: "valid-token", expectedHostname: "example.com" }),
    ).resolves.toBeUndefined();
  });

  it("rejects a valid token response for the wrong host or action", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, hostname: "attacker.example", action: "login" }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      verifyTurnstileToken({ token: "valid-token", expectedHostname: "example.com" }),
    ).rejects.toThrow("rejected");
  });

  it("rejects missing and oversized tokens before network access", () => {
    expect(() => assertTurnstileTokenShape("")).toThrow(TurnstileVerificationError);
    expect(() => assertTurnstileTokenShape("x".repeat(2_049))).toThrow(
      TurnstileVerificationError,
    );
  });
});
