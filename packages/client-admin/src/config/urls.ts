const URL_2 = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(
  /\/$/,
  "",
);
const MAIN_URL = import.meta.env.VITE_GRAPHQL_URL || `${URL_2}/graphql`;

export { MAIN_URL, URL_2 };

