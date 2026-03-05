import { createRemoteJWKSet, jwtVerify } from "jose";

const ACCESS_TOKEN_AUDIENCE = "authenticated";

let cachedJwksUrl = "";
let cachedJwks = null;

function getSupabaseUrl() {
  const value = String(process.env.SUPABASE_URL || "").trim();
  if (!value) {
    throw new Error("SUPABASE_URL is required.");
  }
  return value.replace(/\/$/, "");
}

function getIssuer() {
  return `${getSupabaseUrl()}/auth/v1`;
}

function getJwks() {
  const jwksUrl = `${getIssuer()}/.well-known/jwks.json`;
  if (cachedJwks && cachedJwksUrl === jwksUrl) {
    return cachedJwks;
  }

  cachedJwksUrl = jwksUrl;
  cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
  return cachedJwks;
}

export function isAuthConfigured() {
  return Boolean(String(process.env.SUPABASE_URL || "").trim());
}

export async function verifyAccessToken(token) {
  const jwt = String(token || "").trim();
  if (!jwt) {
    throw new Error("Token is required.");
  }

  const { payload } = await jwtVerify(jwt, getJwks(), {
    issuer: getIssuer(),
    audience: ACCESS_TOKEN_AUDIENCE
  });

  return payload;
}
