import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { credentialsMatch, generateBase32Secret, normalizeAdminId, totpCode, verifyTotp } from "./totp.ts";

const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp", () => {
  it("matches the RFC 6238 SHA1 vectors", () => {
    const vectors: Array<[number, string]> = [
      [59_000, "287082"],
      [1_111_111_109_000, "081804"],
      [1_111_111_111_000, "050471"],
      [1_234_567_890_000, "005924"],
      [2_000_000_000_000, "279037"],
      [20_000_000_000_000, "353130"],
    ];
    for (const [now, code] of vectors) {
      assert.equal(totpCode(SECRET, now), code);
      assert.equal(verifyTotp(SECRET, code, now), true);
    }
  });

  it("rejects a wrong code and a bad secret", () => {
    assert.equal(verifyTotp(SECRET, "000000", 59_000), false);
    assert.equal(verifyTotp("!!!!", "287082", 59_000), false);
  });

  it("checks the admin id and the code together", () => {
    const savedId = process.env.ADMIN_ID;
    const savedSecret = process.env.ADMIN_TOTP_SECRET;
    process.env.ADMIN_ID = "raven";
    process.env.ADMIN_TOTP_SECRET = SECRET;
    try {
      assert.equal(credentialsMatch("raven", "287082", 59_000), "ok");
      assert.equal(credentialsMatch("other", "287082", 59_000), "bad");
      assert.equal(credentialsMatch("raven", "000000", 59_000), "bad");
    } finally {
      if (savedId == null) delete process.env.ADMIN_ID;
      else process.env.ADMIN_ID = savedId;
      if (savedSecret == null) delete process.env.ADMIN_TOTP_SECRET;
      else process.env.ADMIN_TOTP_SECRET = savedSecret;
    }
  });

  it("makes a secret the authenticator can use", () => {
    const secret = generateBase32Secret();
    assert.equal(secret.length, 32);
    const code = totpCode(secret);
    assert.equal(code?.length, 6);
    assert.equal(verifyTotp(secret, code ?? ""), true);
  });

  it("accepts a short admin id and rejects a blank one", () => {
    assert.equal(normalizeAdminId("  desk-2  "), "desk-2");
    assert.equal(normalizeAdminId("운영"), "운영");
    assert.equal(normalizeAdminId("a"), null);
    assert.equal(normalizeAdminId("has space"), null);
  });
});
