import { db } from "./config/database.js";

// Node HTTP requests expose req/res as in the reference server.
// Authentication is gated earlier, in the Yoga `onParams` plugin (see app.js),
// so by the time this runs `req.user` is already set for protected operations.
export function createContext({ request, req, res }) {
  return { request, req, res, db };
}
