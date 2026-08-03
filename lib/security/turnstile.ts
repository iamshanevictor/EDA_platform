const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_ACTION = "upload";
const MAX_TOKEN_LENGTH = 2_048;

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export class TurnstileVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurnstileVerificationError";
  }
}

export function assertTurnstileTokenShape(token: string): void {
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new TurnstileVerificationError("The security challenge is invalid.");
  }
}

export async function verifyTurnstileToken({
  token,
  expectedHostname,
  remoteIp,
}: {
  token: string;
  expectedHostname: string;
  remoteIp?: string;
}): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new TurnstileVerificationError("Turnstile is not configured.");
  }

  assertTurnstileTokenShape(token);

  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch {
    throw new TurnstileVerificationError("The security challenge is unavailable.");
  }

  if (!response.ok) {
    throw new TurnstileVerificationError("The security challenge is unavailable.");
  }

  const result = (await response.json()) as TurnstileResponse;
  if (
    !result.success ||
    result.hostname !== expectedHostname ||
    result.action !== EXPECTED_ACTION
  ) {
    throw new TurnstileVerificationError("The security challenge was rejected.");
  }
}
