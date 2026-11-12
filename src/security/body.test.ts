import { expect, it } from "vitest";
import { readLimitedText } from "./body";

it("bounds UTF-8 bytes rather than characters without a declared length", async () => {
  const request = new Request("https://example.com", { method: "POST", body: "界".repeat(10) });
  await expect(readLimitedText(request, 20)).rejects.toThrow("too large");
});
it("accepts an exact byte boundary", async () => {
  const request = new Request("https://example.com", { method: "POST", body: "界" });
  await expect(readLimitedText(request, 3)).resolves.toBe("界");
});
