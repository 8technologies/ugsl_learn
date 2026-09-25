import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

import { env } from "~/env.mjs";

const AUTH_TOKEN_STORAGE_KEY = "ugsl_auth_token";

const httpLink = new HttpLink({
  uri: env.NEXT_PUBLIC_GRAPHQL_URL,
});

const authLink = setContext((_operation, { headers }) => {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      : null;

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
