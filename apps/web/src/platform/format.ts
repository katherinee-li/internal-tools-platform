// Shared formatting helpers used across tools.
export function money(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
