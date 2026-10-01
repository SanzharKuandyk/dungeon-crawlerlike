export function requestId() {
  // getRandomValues also works when phones use an HTTP LAN address.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
