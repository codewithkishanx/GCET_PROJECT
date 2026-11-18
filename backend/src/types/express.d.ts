import type { User } from "@dsa/shared";

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: User;
      validated: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
