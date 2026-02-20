import { describe, expect, it, vi } from "vitest";
import { OneCClient } from "../packages/sdk/src/client";

describe("sdk client", () => {
  it("stores access token after login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "token-123" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new OneCClient({ baseUrl: "http://localhost:3000" });
    const response = await client.login("manager", "manager");

    expect(response.accessToken).toBe("token-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
