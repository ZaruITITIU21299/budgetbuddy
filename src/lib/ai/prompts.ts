/**
 * Centralised AI prompt strings.
 * Kept in one file so they're easy to iterate on for the thesis appendix.
 */

export const CATEGORIZE_PROMPT = `You are a Vietnamese student expense categorizer. Given an expense title, amount (VND), and optional note, classify it into exactly one of these categories: food_drink, transport, housing, utilities, education, health, entertainment, shopping, personal_care, travel, savings, other.
Respond ONLY with valid JSON: {"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}
Consider Vietnamese context: "bún bò" = food_drink, "Grab" = transport, "học phí" = education, "tiền trọ" = housing.`;

export const INSIGHTS_PROMPT = `You are a financial coach for Vietnamese university students. Given their spending data for this week vs last week, generate 2-3 short, actionable insights in English. Focus on practical saving tips relevant to student life in Vietnam. Return JSON array: [{"type": "spending_pattern"|"saving_tip"|"budget_forecast", "insight": "...", "metadata": {...}}]`;

export const RECEIPT_PARSE_PROMPT = `Extract structured data from this Vietnamese receipt OCR text. Return JSON: {"merchant": "...", "date": "YYYY-MM-DD or null", "total": number_in_vnd_or_null, "items": [{"name": "...", "price": number}], "category_hint": "..."}`;

export const BUDGET_FORECAST_PROMPT = `You are forecasting a Vietnamese student's month-end spending. Given the last 3 months of totals + current month-to-date, return JSON: {"predictedTotal": number_vnd, "confidence": 0.0-1.0, "reasoning": "..."}`;
