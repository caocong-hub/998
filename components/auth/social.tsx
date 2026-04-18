"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
interface socialProps {
  type: "signIn"| "signUp" | "error"
};


export const Social = ({type}: socialProps) => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const onClick = () => {
    signIn("credentials", {
      account: "998",
      password: "12",
      callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
    });
  };

  return (
    <div className="flex items-center w-full gap-x-2">
      <Button
        size="lg"
        className="w-full"
        onClick={onClick}
      >
        {type==="signUp" ? "Use demo account 998 to sign up and log in" : "Use demo account 998 to log in"}  
      </Button>
    </div>
  );
};
