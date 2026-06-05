export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export const AUTH_CONFIG = {
  get tenantId(): string {
    return process.env.SSO_TENANT_ID!;
  },
  get clientId(): string {
    return process.env.SSO_CLIENT_ID!;
  },
  get clientSecret(): string {
    return process.env.SSO_CLIENT_SECRET!;
  },
  get redirectUri(): string {
    return process.env.SSO_REDIRECT_URI || "http://localhost:3000/auth/callback/sso";
  },
};
