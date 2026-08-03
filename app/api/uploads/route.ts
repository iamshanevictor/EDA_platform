import { analyzeDatasetData } from "@/lib/analysis/analyzeDataset";
import {
  UPLOAD_LIMITS,
  UploadValidationError,
  decodeUtf8Csv,
  parseAndValidateCsv,
  validateCsvFileMetadata,
  validateStoredJsonSize,
} from "@/lib/security/upload-limits";
import {
  assertTurnstileTokenShape,
  TurnstileVerificationError,
  verifyTurnstileToken,
} from "@/lib/security/turnstile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_MULTIPART_OVERHEAD = 256 * 1024;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let attemptId: string | null = null;
  let ownerId: string | null = null;
  let uploadSucceeded = false;
  const supabase = await createClient();
  let admin: ReturnType<typeof createAdminClient> | null = null;

  try {
    assertUploadsEnabled();
    assertSameOrigin(request);
    assertRequestEnvelope(request);
    admin = createAdminClient();

    const formData = await request.formData();
    const file = formData.get("file");
    const turnstileToken = formData.get("turnstileToken");

    if (!(file instanceof File) || typeof turnstileToken !== "string") {
      return errorResponse("A CSV file and security challenge are required.", 400);
    }

    validateCsvFileMetadata(file);
    assertTurnstileTokenShape(turnstileToken);

    const user = await getOrCreateAnonymousUser({
      supabase,
      token: turnstileToken,
      request,
    });
    ownerId = user.id;

    const { data: reservedAttempt, error: reservationError } = await admin.rpc(
      "reserve_upload_attempt",
      { requested_owner: user.id },
    );
    if (reservationError || typeof reservedAttempt !== "string") {
      return quotaErrorResponse(reservationError?.message);
    }
    attemptId = reservedAttempt;

    const csvText = decodeUtf8Csv(await file.arrayBuffer());
    const { rows } = parseAndValidateCsv(csvText);
    validateStoredJsonSize(rows);
    assertWithinDeadline(startedAt);

    const analysis = analyzeDatasetData(rows);
    assertWithinDeadline(startedAt);

    const { data: completedUpload, error: completionError } = await admin.rpc(
      "complete_upload_attempt",
      {
        attempt_id: attemptId,
        requested_owner: user.id,
        requested_file_name: file.name,
        requested_file_size: file.size,
        requested_data: rows,
        requested_summary_stats: analysis.summary_stats,
        requested_missing_values: analysis.missing_values,
        requested_column_types: analysis.column_types,
        requested_correlation_matrix: analysis.correlation_matrix,
      },
    );

    const dataset = Array.isArray(completedUpload) ? completedUpload[0] : null;
    if (completionError || !dataset) {
      throw new Error("Dataset persistence failed.");
    }

    uploadSucceeded = true;
    attemptId = null;
    return NextResponse.json(
      { datasetId: dataset.dataset_id, expiresAt: dataset.expires_at },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UploadsDisabledError) {
      return errorResponse("Uploads are temporarily disabled.", 503, {
        "Retry-After": "300",
      });
    }

    if (
      error instanceof UploadValidationError ||
      error instanceof TurnstileVerificationError
    ) {
      return errorResponse(error.message, 400);
    }

    console.error(
      "Upload request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return errorResponse("The upload could not be completed.", 500);
  } finally {
    if (attemptId && ownerId && admin) {
      const { error } = await admin.rpc("finish_upload_attempt", {
        attempt_id: attemptId,
        requested_owner: ownerId,
        was_successful: uploadSucceeded,
      });
      if (error) {
        console.error("Failed to finalize upload quota state.");
      }
    }
  }
}

function assertUploadsEnabled(): void {
  if (process.env.UPLOADS_ENABLED !== "true") {
    throw new UploadsDisabledError();
  }
}

function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new UploadValidationError("The upload origin is not allowed.");
  }
}

function assertRequestEnvelope(request: NextRequest): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new UploadValidationError("Uploads must use multipart form data.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > UPLOAD_LIMITS.maxFileBytes + MAX_MULTIPART_OVERHEAD
  ) {
    throw new UploadValidationError("The upload request is too large.");
  }
}

async function getOrCreateAnonymousUser({
  supabase,
  token,
  request,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  token: string;
  request: NextRequest;
}): Promise<User> {
  const { data: existingUser } = await supabase.auth.getUser();
  if (existingUser.user) {
    if (!existingUser.user.is_anonymous) {
      throw new TurnstileVerificationError("An anonymous session is required.");
    }

    await verifyTurnstileToken({
      token,
      expectedHostname: request.nextUrl.hostname,
      remoteIp: getClientIp(request),
    });
    return existingUser.user;
  }

  // Supabase Auth performs the mandatory server-side Turnstile verification
  // for identity creation. A Turnstile token is single-use, so it must not also
  // be sent to Siteverify directly in this branch.
  const { data, error } = await supabase.auth.signInAnonymously({
    options: { captchaToken: token },
  });
  if (error || !data.user?.is_anonymous) {
    throw new TurnstileVerificationError("Anonymous session creation failed.");
  }

  return data.user;
}

function getClientIp(request: NextRequest): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

function assertWithinDeadline(startedAt: number): void {
  if (Date.now() - startedAt > 18_000) {
    throw new Error("Upload processing deadline exceeded.");
  }
}

function quotaErrorResponse(message?: string) {
  const safeMessages = new Set([
    "hourly upload limit reached",
    "an upload is already processing",
    "active dataset limit reached",
  ]);
  if (message && safeMessages.has(message)) {
    return errorResponse(message, 429, { "Retry-After": "60" });
  }
  return errorResponse("The upload service is not ready.", 503, {
    "Retry-After": "300",
  });
}

function errorResponse(
  message: string,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

class UploadsDisabledError extends Error {}
