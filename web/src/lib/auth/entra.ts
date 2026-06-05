import { MicrosoftEntraId } from "arctic";
import { AUTH_CONFIG } from "@/lib/auth/config";

let _entra: MicrosoftEntraId | null = null;

export function getEntra(): MicrosoftEntraId {
  if (!_entra) {
    _entra = new MicrosoftEntraId(
      AUTH_CONFIG.tenantId,
      AUTH_CONFIG.clientId,
      AUTH_CONFIG.clientSecret,
      AUTH_CONFIG.redirectUri
    );
  }
  return _entra;
}
