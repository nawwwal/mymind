import { afterEach, describe, expect, it, vi } from "vitest";
import { Exit } from "../../src/actions/errors.js";
import { requireConfirm } from "../../src/cli-app/io.js";

describe("requireConfirm", () => {
  const savedAuto = process.env.MYMIND_AUTO_CONFIRM;

  afterEach(() => {
    if (savedAuto === undefined) {
      delete process.env.MYMIND_AUTO_CONFIRM;
    } else {
      process.env.MYMIND_AUTO_CONFIRM = savedAuto;
    }
    vi.restoreAllMocks();
  });

  it("exits CONFIRM without flag", () => {
    delete process.env.MYMIND_AUTO_CONFIRM;
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`exit:${code ?? ""}`);
    });
    expect(() => requireConfirm(undefined, "need confirm")).toThrow(`exit:${Exit.CONFIRM}`);
  });

  it("allows when MYMIND_AUTO_CONFIRM=1", () => {
    process.env.MYMIND_AUTO_CONFIRM = "1";
    requireConfirm(undefined, "ignored");
  });
});
