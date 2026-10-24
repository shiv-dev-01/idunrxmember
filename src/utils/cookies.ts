const isSecure =
  typeof window !== "undefined" && window.location.protocol === "https:";

export function setCookie(
  name: string,
  value: string,
  maxAgeSec = 8 * 60 * 60
): void {
  const secure = isSecure ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const encoded = encodeURIComponent(name) + "=";
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(encoded)) {
      return decodeURIComponent(trimmed.slice(encoded.length));
    }
  }
  return null;
}

export function removeCookie(name: string): void {
  const secure = isSecure ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(
    name
  )}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
