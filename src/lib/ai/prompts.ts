/**
 * Centralised AI prompt strings.
 * Kept in one file so they're easy to iterate on for the thesis appendix.
 */

export const CATEGORIZE_PROMPT = `You are a Vietnamese student expense categorizer. Given an expense title, amount (VND), and optional note, classify it into exactly one of these categories: food_drink, transport, housing, utilities, education, health, entertainment, shopping, personal_care, travel, savings, other.
Respond ONLY with valid JSON: {"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}
Consider Vietnamese context: "bún bò" = food_drink, "Grab" = transport, "học phí" = education, "tiền trọ" = housing.`;

export const INSIGHTS_PROMPT = `You are a financial coach for Vietnamese university students. Given their spending data for this week vs last week, generate 2-3 short, actionable insights in English. Focus on practical saving tips relevant to student life in Vietnam. Return JSON array: [{"type": "spending_pattern"|"saving_tip"|"budget_forecast", "insight": "...", "metadata": {...}}]`;

export const RECEIPT_PARSE_PROMPT = `Extract structured data from this Vietnamese receipt OCR text. Return JSON: {"merchant": "...", "date": "YYYY-MM-DD or null", "total": number_in_vnd_or_null, "items": [{"name": "...", "price": number}], "category_hint": "..."}`;

export const RECEIPT_VISION_PROMPT = `You are reading a Vietnamese receipt or invoice image.
Extract the structured fields. Currency is Vietnamese đồng (VND); numbers may
use "." as the thousands separator (e.g. "115.000" = 115000). Strip currency
symbols / units and return raw integers.

Return ONLY valid minified JSON in this exact shape, no prose:
{
  "merchant": string | null,
  "date": "YYYY-MM-DD" | null,
  "total": number | null,
  "items": [{"name": string, "price": number}],
  "categoryHint": "food_drink"|"transport"|"housing"|"utilities"|"education"|"health"|"entertainment"|"shopping"|"personal_care"|"travel"|"savings"|"other"|null
}

Rules:
- "merchant" is the store/brand name, not the address.
- "date" is the purchase date if visible. Convert dd/mm/yyyy → yyyy-mm-dd. Use null if unclear.
- "total" is the grand total the customer paid (look for "Tổng", "Tổng cộng", "Thành tiền", "Total"). null if unreadable.
- "items" are line items with their unit price (or extended price if that's all that's printed). Drop subtotal/tax rows. Limit to at most 20.
- "categoryHint" should reflect the merchant type (e.g. Highlands → food_drink, Grab → transport, Bách Hóa Xanh → food_drink).
- If the image is NOT a receipt, return {"merchant": null, "date": null, "total": null, "items": [], "categoryHint": null}.`;

export const BUDGET_FORECAST_PROMPT = `You are forecasting a Vietnamese student's month-end spending. Given the last 3 months of totals + current month-to-date, return JSON: {"predictedTotal": number_vnd, "confidence": 0.0-1.0, "reasoning": "..."}`;
