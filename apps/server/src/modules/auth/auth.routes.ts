import { type FastifyInstance } from "fastify";
import { AuthService } from "./auth.service";

export function registerAuthRoutes(app: FastifyInstance): void {
  const authService = new AuthService(app);

  app.post<{ Body: unknown }>("/api/auth/login", async (request) => {
    return authService.login(request.body);
  });
}
