import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      username: string;
      role: string;
    };
    user: {
      username: string;
      role: string;
    };
  }
}
