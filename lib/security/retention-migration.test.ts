import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260804000100_phase_2_security.sql",
  ),
  "utf8",
);

describe("Phase 2 retention migration", () => {
  it("backfills expiration for legacy ownerless datasets", () => {
    const backfill = migration.match(
      /update public\.datasets\s+set expires_at = created_at \+ interval '24 hours'\s+where expires_at is null;/,
    );

    expect(backfill).not.toBeNull();
  });

  it("purges every expired dataset, including legacy ownerless rows", () => {
    expect(migration).toMatch(
      /delete from public\.datasets\s+where expires_at <= now\(\);/,
    );
    expect(migration).not.toMatch(
      /delete from public\.datasets\s+where owner_id is not null\s+and expires_at <= now\(\);/,
    );
  });
});
