// Utilities to decode JWT and work with permissions payload

type FlatPermissions = Record<string, boolean>;

const base64UrlDecode = (str: string): string => {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return json;
  } catch {
    return "";
  }
};

const decodeJWTPayload = (token?: string) => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payloadJson = base64UrlDecode(parts[1]);
  try {
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

// Roles created by older data use an array of permission objects, while newer
// roles store one flat JSON object. Accept both shapes so valid staff accounts
// are not rejected at login.
const flattenPermissions = (permissions: unknown): FlatPermissions => {
  const flat: FlatPermissions = {};

  if (Array.isArray(permissions)) {
    for (const item of permissions) {
      if (typeof item === "string") {
        flat[item] = true;
        continue;
      }

      if (item && typeof item === "object") {
        for (const [k, v] of Object.entries(item)) {
          if (v) flat[k] = true;
        }
      }
    }
  } else if (permissions && typeof permissions === "object") {
    for (const [key, value] of Object.entries(permissions)) {
      if (value) flat[key] = true;
    }
  }

  return flat;
};

const getPermissionsFromToken = (token?: string): FlatPermissions => {
  const payload = decodeJWTPayload(token);
  if (!payload) return {};
  return flattenPermissions((payload as any).permissions);
};

export { decodeJWTPayload, flattenPermissions, getPermissionsFromToken };
