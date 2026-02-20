import { describe, expect, it } from "vitest";
import { validateCredentials } from "../src/auth";

describe("auth credential validation", () => {
  it("returns role and username for valid credentials", () => {
    const user = validateCredentials("manager", "manager");
    expect(user).toEqual({
      username: "manager",
      role: "Manager"
    });
  });

  it("returns null for invalid credentials", () => {
    const user = validateCredentials("manager", "wrong-password");
    expect(user).toBeNull();
  });
});
