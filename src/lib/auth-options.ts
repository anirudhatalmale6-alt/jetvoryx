import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Check admin user first
        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        });

        if (admin) {
          const valid = await bcrypt.compare(credentials.password, admin.password);
          if (!valid) return null;
          return { id: admin.id, email: admin.email, name: admin.name, role: 'admin' };
        }

        // Check regular user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: 'user',
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || undefined,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  useSecureCookies: false,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'user';
        token.firstName = (user as { firstName?: string }).firstName;
        token.lastName = (user as { lastName?: string }).lastName;
        token.phone = (user as { phone?: string }).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).firstName = token.firstName;
        (session.user as Record<string, unknown>).lastName = token.lastName;
        (session.user as Record<string, unknown>).phone = token.phone;
      }
      return session;
    },
  },
};
