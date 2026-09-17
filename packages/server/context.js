import { db } from "./config/database.js";

// Node HTTP requests expose req/res as in the reference server.
export function createContext({ request, req, res }) {
  return { request, req, res, db };
}
