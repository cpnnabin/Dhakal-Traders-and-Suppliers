
  name: "Dhakal Traders",
  address: "Kathmandu, Nepal",
  phone: "980-XXXXXXX",
  pan: "XXXXXXXXX",
  reg: "Reg No: XXX/XXX",
};

/** Convert Gregorian Date to Nepali Bikram Sambat (BS) format DD/MM/YYYY */
export function toMiti(date: Date): string {
  // Simple placeholder conversion – replace with proper Nepali date library if available
  // Using Intl for demonstration; real implementation would use a Nepali calendar package.
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
  const formatted = new Intl.DateTimeFormat("en-GB", options).format(date);
  // Pretend the BS date is the same as Gregorian for now.
  return formatted;
}

/** Convert a number to words, prefix with Rs. and suffix "only" */
(n: number): string {
  if (n === 0) return "Rs. Zero only";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const toWords = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " and " + toWords(num % 100) : "");
    if (num < 1000000) return toWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + toWords(num % 1000) : "");
    return num.toString();
  };
  return `Rs. ${toWords(n)} only`;
}

/** Generate a preview bill number based on current date and a counter stored in localStorage */
export function formatPreviewBillNo(): string {
  const today = new Date();
  const y = today.getFullYear().toString().slice(-2);
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const key = `dt_bill_counter:${y}${m}${d}`;
  const cur = parseInt(localStorage.getItem(key) || "0", 10) || 0;
  const next = cur + 1;
  localStorage.setItem(key, String(next));
  return `${y}${m}${d}-${String(next).padStart(4, "0")}`;
}

/** Simple language toggle – returns Nepali string if app language is set to 'ne', otherwise English */
export function t(ne: string, en: string): string {
  // Assume a global language setting stored in localStorage under 'dt_lang'
  const lang = localStorage.getItem("dt_lang") || "en";
  return lang === "ne" ? ne : en;
}

/** Check if a role string corresponds to a staff member */
export function isStaff(role: string): boolean {
  const staffRoles = ["admin", "owner", "cashier", "manager"];
  return staffRoles.includes(role?.toLowerCase() ?? "");
}
