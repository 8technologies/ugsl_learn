import { type AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import { ApolloProvider } from "@apollo/client/react";

import { apolloClient } from "~/lib/apolloClient";
import "~/styles/globals.css";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ApolloProvider client={apolloClient}>
      <Head>
        <title>React Duolingo Clone</title>
        <meta
          name="description"
          content="Duolingo web app clone written with React"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0A0" />
        <link rel="manifest" href="/app.webmanifest" />
      </Head>
      <Component {...pageProps} />
    </ApolloProvider>
  );
};

export default MyApp;
