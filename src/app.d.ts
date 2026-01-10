// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { Session, User } from '@auth/core/types';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      auth(): Promise<Session | null>;
    }
    interface PageData {
      session: Session | null;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

// Extend Auth.js types
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      isActive?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    isActive?: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    isActive?: boolean;
  }
}

export {};
