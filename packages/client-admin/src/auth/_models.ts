import { type TLanguageCode } from "@/i18n";

export interface AuthModel {
  access_token: string;
  refreshToken?: string;
  api_token?: string;
}

// export interface UserModel {
//   id: number;
//   username: string;
//   password: string | undefined;
//   email: string;
//   name: string;
//   last_name: string;
//   fullname?: string;
//   occupation?: string;
//   companyName?: string;
//   phone?: string;
//   roles?: number[];
//   pic?: string;
//   language?: TLanguageCode;
//   auth?: AuthModel;
// }

// Matches the UGSL server's User type (see the ME query)
export interface UserModel {
  id: string;
  username: string;
  email: string;
  name: string;
  // Avatar file name (the header and user menu show it when set)
  image?: string | null;
  roleId?: string | null;
  role?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}
