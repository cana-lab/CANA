// Smoke tests for the encrypted device-to-device transfer.
// Pins down the CHANGELOG 4.37.0 / 4.39.0 claims: AES-GCM round-trip,
// wrong-passphrase rejection, foreign-file rejection.

import { describe, it, expect } from "vitest";
import {
  encryptPayload,
  decryptPayload,
  buildTransferPayload,
  validateTransfer,
} from "./transfer.js";

const samplePayload = buildTransferPayload(
  {
    names: { A: "Alex", B: "Bo" },
    answers: { m1: 7, m2: 8 },
    sessions: [{ id: "s1", report: { ok: true } }],
    results: { overall: 7.2 },
  },
  { appVersion: "4.43.0", platform: "test", profileEmail: "alex.bo@example.org" },
  null
);

describe("encrypt → decrypt round-trip", () => {
  it("decrypts back to the same payload with the right passphrase", async () => {
    const file = await encryptPayload(samplePayload, "correct horse battery staple");
    const out = await decryptPayload(file, "correct horse battery staple");
    expect(out).toEqual(samplePayload);
  });

  it("rejects a wrong passphrase with a clear error", async () => {
    const file = await encryptPayload(samplePayload, "correct horse battery staple");
    await expect(decryptPayload(file, "wrong-passphrase")).rejects.toThrow(/passphrase/i);
  });

  it("rejects tampered ciphertext", async () => {
    const file = await encryptPayload(samplePayload, "correct horse battery staple");
    const env = JSON.parse(file);
    env.data = env.data.slice(0, -4) + "XXXX"; // mutate a byte of ciphertext
    const tampered = JSON.stringify(env);
    await expect(decryptPayload(tampered, "correct horse battery staple")).rejects.toThrow();
  });

  it("rejects non-CANA files cleanly", async () => {
    const foreign = JSON.stringify({ hello: "world" });
    await expect(decryptPayload(foreign, "anything")).rejects.toThrow(/CANA/);
  });

  it("rejects too-short passphrases at encrypt time", async () => {
    await expect(encryptPayload(samplePayload, "12345")).rejects.toThrow(/6 characters/i);
  });
});

describe("validateTransfer", () => {
  it("returns a normalized shape with sensible defaults", () => {
    const v = validateTransfer(samplePayload);
    expect(v.names.A).toBe("Alex");
    expect(v.sessions.length).toBe(1);
    expect(v.results.overall).toBe(7.2);
  });

  it("rejects an envelope with the wrong kind", () => {
    expect(() => validateTransfer({ kind: "something-else", payload: {} })).toThrow();
  });
});
