import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useBoundStore } from "~/hooks/useBoundStore";
import { MY_PERMISSIONS } from "~/gql/queries";

type MyPermissionsResult = {
  user: { id: string; role: { id: string; name: string; permissions: unknown } | null } | null;
};

// Role permissions are saved as [{ can_x: true }, ...]; older data may be a
// list of keys or a flat object. Same rules as the server's hasPermission().
export const normalizePermissions = (raw: unknown): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === "string") result[entry] = true;
      else if (entry && typeof entry === "object") {
        for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
          if (value === true) result[key] = true;
        }
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value) result[key] = true;
    }
  }
  return result;
};

// The signed-in user's permissions as { key: true }. Only for showing/hiding UI;
// the server still checks permissions on every request.
export const usePermissions = () => {
  const userId = useBoundStore((x) => x.id);
  const { data, loading } = useQuery<MyPermissionsResult>(MY_PERMISSIONS, {
    variables: { userId },
    skip: !userId,
  });

  const permissions = useMemo(
    () => normalizePermissions(data?.user?.role?.permissions),
    [data?.user?.role?.permissions],
  );

  return { permissions, roleName: data?.user?.role?.name ?? null, loading };
};
