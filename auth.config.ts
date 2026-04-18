import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const account = (credentials as any)?.account as string | undefined;
        const password = (credentials as any)?.password as string | undefined;

        if (account !== "998" || password !== "12") {
          return null;
        }

        // Return a static demo user (no database required)
        return {
          id: "demo-user-998",
          name: "Account 998",
          email: "998@example.com",
          rollNo: "998",
        };
      },
    })
  ],
} satisfies NextAuthConfig