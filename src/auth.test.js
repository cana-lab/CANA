// Smoke tests for the local profile auth.
// These pin down:
//  - PBKDF2 verification round-trip
//  - that wrong passwords are rejected
//  - that imported profiles (with their own salt/hash) sign in unchanged

import { describe, it, expect, beforeEach } from "vitest";
import {
  createProfile,
  signIn,
  hashPassword,
  registerProfileRecord,
  loadProfiles,
} from "./auth.js";

beforeEach(() => {
  // jsdom gives us a real localStorage; clear it between tests so profiles
  // don't bleed across cases.
  globalThis.localStorage.clear();
});

describe("createProfile + signIn", () => {
  it("creates a profile and signs in with the same password", async () => {
    const out = await createProfile({
      nameA: "Alex", nameB: "Bo", email: "alex.bo@example.org", password: "secret123",
    });
    expect(out.ok).toBe(true);
    expect(out.profile).toBeTruthy();
    expect(out.profile.algo).toBe("pbkdf2");
    expect(out.profile.hash).not.toContain("secret123");

    const ok = await signIn({ email: "alex.bo@example.org", password: "secret123" });
    expect(ok.ok).toBe(true);
    expect(ok.profile.email).toBe("alex.bo@example.org");
  });

  it("rejects a wrong password without leaking which field was wrong", async () => {
    await createProfile({
      nameA: "Alex", nameB: "Bo", email: "alex.bo@example.org", password: "secret123",
    });
    const bad = await signIn({ email: "alex.bo@example.org", password: "wrong-password" });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
  });

  it("rejects empty / too-short passwords", async () => {
    const r = await createProfile({
      nameA: "Alex", nameB: "Bo", email: "alex.bo@example.org", password: "12",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects malformed emails", async () => {
    const r = await createProfile({
      nameA: "Alex", nameB: "Bo", email: "not-an-email", password: "secret123",
    });
    expect(r.ok).toBe(false);
  });
});

describe("hashPassword stability", () => {
  it("is deterministic for the same salt+password", async () => {
    const h1 = await hashPassword("secret123", "abcd1234");
    const h2 = await hashPassword("secret123", "abcd1234");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]+$/);
  });

  it("changes when salt changes", async () => {
    const h1 = await hashPassword("secret123", "abcd1234");
    const h2 = await hashPassword("secret123", "wxyz5678");
    expect(h1).not.toBe(h2);
  });
});

describe("registerProfileRecord (cross-device import)", () => {
  it("inserts an imported profile and lets it sign in with the original password", async () => {
    // Simulate device A: create + extract the stored record.
    await createProfile({
      nameA: "Alex", nameB: "Bo", email: "alex.bo@example.org", password: "secret123",
    });
    const recA = loadProfiles().find((p) => p.email === "alex.bo@example.org");
    expect(recA).toBeTruthy();

    // Simulate device B: blank localStorage, then receive the record.
    globalThis.localStorage.clear();
    const reg = registerProfileRecord(recA);
    expect(reg.ok).toBe(true);
    expect(reg.existed).toBe(false);

    // The same password works on the new device with no re-hash.
    const ok = await signIn({ email: "alex.bo@example.org", password: "secret123" });
    expect(ok.ok).toBe(true);
  });

  it("does not duplicate when the same record is imported twice", async () => {
    await createProfile({
      nameA: "Alex", nameB: "Bo", email: "alex.bo@example.org", password: "secret123",
    });
    const recA = loadProfiles().find((p) => p.email === "alex.bo@example.org");

    const reg = registerProfileRecord(recA);
    expect(reg.ok).toBe(true);
    expect(reg.existed).toBe(true);
    expect(loadProfiles().length).toBe(1);
  });

  it("rejects records missing credentials", () => {
    const reg = registerProfileRecord({ email: "x@y.z" });
    expect(reg.ok).toBe(false);
  });
});
