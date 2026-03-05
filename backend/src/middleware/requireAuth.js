import { isAuthConfigured, verifyAccessToken } from "../lib/auth.js";

export async function requireAuth(req, res, next) {
  if (!isAuthConfigured()) {
    res.status(500).json({ error: "Authentication is not configured on server." });
    return;
  }

  const authorization = String(req.headers.authorization || "").trim();
  if (!authorization) {
    res.status(401).json({ error: "Authorization header is required." });
    return;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Authorization header must be in Bearer token format." });
    return;
  }

  try {
    const payload = await verifyAccessToken(token);
    const email = typeof payload.email === "string" ? payload.email : "";
    const username = email ? email.split("@")[0] : "";
    req.authUser = {
      id: String(payload.sub || ""),
      email,
      username,
      role: String(payload.role || "")
    };
    next();
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}
