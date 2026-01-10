/**
 * TASK-096: Auth.js Configuration
 *
 * Central authentication configuration using Auth.js with SvelteKit.
 * Supports GitHub OAuth and credentials providers.
 */

import { SvelteKitAuth, type SvelteKitAuthConfig } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import Credentials from '@auth/sveltekit/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '$lib/server/prisma';
import type { Provider } from '@auth/sveltekit/providers';
import { env } from '$env/dynamic/private';

/**
 * Configure authentication providers based on environment
 */
function getProviders(): Provider[] {
  const providers: Provider[] = [];

  // GitHub OAuth provider
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET
      })
    );
  }

  // Credentials provider for development/testing
  if (env.ENABLE_CREDENTIALS_AUTH === 'true') {
    providers.push(
      Credentials({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
          if (!credentials?.email) {
            return null;
          }

          // In development, auto-create/find user
          const email = credentials.email as string;

          try {
            let user = await prisma.user.findUnique({
              where: { email }
            });

            if (!user) {
              // Create user if doesn't exist (dev mode only)
              user = await prisma.user.create({
                data: {
                  email,
                  name: email.split('@')[0],
                  emailVerified: new Date()
                }
              });
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image || user.avatarUrl
            };
          } catch (error) {
            console.error('Auth error:', error);
            return null;
          }
        }
      })
    );
  }

  return providers;
}

/**
 * Auth.js configuration
 */
const authConfig: SvelteKitAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: getProviders(),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error'
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Fetch user role from database
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isActive: true }
          });

          if (dbUser) {
            token.role = dbUser.role;
            token.isActive = dbUser.isActive;
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Update last login time
      if (user.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              loginCount: { increment: 1 }
            }
          });
        } catch (error) {
          console.error('Error updating login time:', error);
        }
      }
      return true;
    }
  },
  trustHost: true,
  secret: env.AUTH_SECRET
};

/**
 * Export Auth.js handlers
 */
export const { handle, signIn, signOut } = SvelteKitAuth(authConfig);

/**
 * Re-export for convenience
 */
export { authConfig };
