import { useRouter } from "next/router";
import { useCallback } from "react";
import { useApolloClient } from "@apollo/client/react";
import { useBoundStore } from "~/hooks/useBoundStore";

// Sessions are stateless JWTs, so logging out is client-side: forget the
// token, drop cached data from the previous user, and go to the login page.
export const useLogout = () => {
  const router = useRouter();
  const client = useApolloClient();
  const logOut = useBoundStore((x) => x.logOut);

  return useCallback(async () => {
    logOut();
    await client.clearStore();
    await router.replace("/login");
  }, [client, logOut, router]);
};
