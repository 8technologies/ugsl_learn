import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";

import { env } from "~/env.mjs";
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

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
