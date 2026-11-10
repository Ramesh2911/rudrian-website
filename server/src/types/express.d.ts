import type { Role } from "../generated/prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  locationId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
