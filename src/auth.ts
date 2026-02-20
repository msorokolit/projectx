import { z } from "zod";

export interface AuthUser {
  username: string;
  role: string;
}

interface UserRecord extends AuthUser {
  password: string;
}

const users: UserRecord[] = [
  { username: "admin", password: "admin", role: "Admin" },
  { username: "manager", password: "manager", role: "Manager" },
  { username: "viewer", password: "viewer", role: "Viewer" }
];

export const loginPayloadSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export function validateCredentials(username: string, password: string): AuthUser | null {
  const found = users.find((item) => item.username === username && item.password === password);
  if (!found) {
    return null;
  }
  return {
    username: found.username,
    role: found.role
  };
}
