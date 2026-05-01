import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      gmail: string;
      isAdmin: boolean;
      is_active: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    gmail: string;
    isAdmin: boolean;
    is_active: boolean;
  }
}

const credentialsSchema = z.object({
  gmail: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        gmail: { label: "Gmail", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({
          gmail: parsed.data.gmail.toLowerCase(),
        }).lean();

        if (!user || !user.is_active) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.password,
        );

        if (!passwordMatch) {
          return null;
        }

        // Only store identity fields in the JWT; assignments are read from
        // MongoDB on every request via getCurrentUser() in lib/authz.ts.
        return {
          id: user._id.toString(),
          gmail: user.gmail,
          isAdmin: user.isAdmin,
          is_active: user.is_active,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      const nextToken = token as typeof token & {
        id?: string;
        gmail?: string;
        isAdmin?: boolean;
        is_active?: boolean;
      };

      if (user) {
        nextToken.id = user.id;
        nextToken.gmail = user.gmail;
        nextToken.isAdmin = user.isAdmin;
        nextToken.is_active = user.is_active;
      }

      return nextToken;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.gmail = String(token.gmail ?? "");
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.is_active = Boolean(token.is_active);

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
