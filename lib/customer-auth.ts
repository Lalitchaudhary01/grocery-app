const CUSTOMER_EMAIL_DOMAIN = "customer.local";

export function normalizeMobile(rawMobile: string): string | null {
  const digits = rawMobile.replace(/\D/g, "");
  if (digits.length !== 10) return null;
  return digits;
}

export function mobileToEmail(mobile: string): string {
  return `user_${mobile}@${CUSTOMER_EMAIL_DOMAIN}`;
}

export function emailToMobile(email: string): string | null {
  const match = /^user_(\d{10})@customer\.local$/.exec(email);
  return match?.[1] ?? null;
}
