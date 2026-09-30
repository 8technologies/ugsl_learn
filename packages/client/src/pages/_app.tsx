import { type AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import { useEffect } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { Toaster } from "sonner";

import { apolloClient } from "~/lib/apolloClient";
import { useBoundStore } from "~/hooks/useBoundStore";
import "~/styles/globals.css";

const MyApp: AppType = ({ Component, pageProps }) => {
  const hydrateFromStorage = useBoundStore((x) => x.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <ApolloProvider client={apolloClient}>
      <Head>
        <title>React UGSL Learn Clone</title>
        <meta
          name="description"
          content="UGSL Learn web app clone written with React"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0A0" />
        <link rel="manifest" href="/app.webmanifest" />
      </Head>
      <Component {...pageProps} />
      <Toaster richColors position="top-right" />
    </ApolloProvider>
  );
};

export default MyApp;
