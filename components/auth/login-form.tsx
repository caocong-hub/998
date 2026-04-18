"use client";

import { useState, FormEvent, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { CardWrapper } from "@/components/auth/card-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";

export const LoginForm = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);

    startTransition(async () => {
      const res = await signIn("credentials", {
        redirect: false,
        account,
        password,
        callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
      });

      if (res?.error) {
        setError("Invalid account or password. Correct demo: account 998, password 12.");
        return;
      }

      // Client-side redirect after successful sign-in
      window.location.href = callbackUrl || DEFAULT_LOGIN_REDIRECT;
    });
  };

  return (
    <CardWrapper
      headerLabel="Please log in with your demo account (account: 998, password: 12)"
      backButtonLabel=""
      backButtonHref=""
      showSocial={false}
      type="signIn"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Account (e.g. 998)"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            disabled={isPending}
          />
          <Input
            type="password"
            placeholder="Password (e.g. 12)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
          />
        </div>

        <FormError message={error} />

        <Button type="submit" className="w-full" disabled={isPending}>
          Log in
        </Button>

        <p className="mt-2 text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a
            href="/auth/register"
            className="text-custom-primary hover:underline"
          >
            Register
          </a>
        </p>
      </form>
    </CardWrapper>
  );
};

