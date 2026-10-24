import { env } from "~/env.mjs";
import { getStoredToken } from "~/lib/authStorage";

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

// Sends a mutation with one file attached, using the GraphQL multipart request
// format the server's upload middleware reads. `fileVariablePath` is where the
// file goes in the variables, e.g. "input.video".
export async function mutateWithFile<T>({
  query,
  variables,
  file,
  fileVariablePath,
}: {
  query: string;
  variables: Record<string, unknown>;
  file: File;
  fileVariablePath: string;
}): Promise<T> {
  const body = new FormData();
  body.append("operations", JSON.stringify({ query, variables }));
  body.append("map", JSON.stringify({ 0: [`variables.${fileVariablePath}`] }));
  body.append("0", file);

  const token = getStoredToken();
  const response = await fetch(env.NEXT_PUBLIC_GRAPHQL_URL, {
    method: "POST",
    body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  const result = (await response.json()) as GraphQLResponse<T>;
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join(" "));
  if (!result.data) throw new Error("The server returned no data.");
  return result.data;
}

// Public URL of a file the server stored under its public/ folder (e.g. "units/abc.mp4")
export const mediaUrl = (path: string) => new URL(`/${path}`, env.NEXT_PUBLIC_GRAPHQL_URL).toString();
