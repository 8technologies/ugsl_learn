import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";

import { env } from "~/env.mjs";
import { useBoundStore } from "~/hooks/useBoundStore";
import { getStoredToken } from "~/lib/authStorage";

const httpLink = new HttpLink({
  uri: env.NEXT_PUBLIC_GRAPHQL_URL,
});

const authLink = new SetContextLink((prevContext) => {
  const token = getStoredToken();

  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// When the server rejects the session, drop it and send the user to sign in
const sessionLink = new ErrorLink(({ error }) => {
  const unauthenticated =
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED");
  if (!unauthenticated || typeof window === "undefined") return;

  useBoundStore.getState().logOut();
  if (window.location.pathname !== "/login") window.location.assign("/login");
});

export const apolloClient = new ApolloClient({
  link: sessionLink.concat(authLink).concat(httpLink),
  cache: new InMemoryCache(),
});
