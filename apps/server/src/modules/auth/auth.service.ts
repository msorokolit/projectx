import { type FastifyInstance } from "fastify";
import { loginPayloadSchema, validateCredentials } from "../../../../../src/auth";

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  login(payload: unknown): { accessToken: string; user: { username: string; role: string } } {
    const body = loginPayloadSchema.parse(payload);
    const user = validateCredentials(body.username, body.password);
    if (!user) {
      throw new Error("Invalid credentials.");
    }
    return {
      accessToken: this.app.jwt.sign({
        username: user.username,
        role: user.role
      }),
      user
    };
  }
}
