/**
 * OCR pipeline.
 *
 * Default: a deterministic mock that returns a realistic Vietnamese receipt
 * after a fake delay (so the UX is identical to a real call).
 *
 * To plug real OCR (e.g. tesseract.js): swap the body of `runOCR`.
 */

const MOCK_RECEIPTS = [
  `HIGHLANDS COFFEE
Chi nhánh Nguyễn Huệ
Ngày: 15/05/2026 14:32

Bạc xỉu đá       45.000
Bánh mì gà       38.000
Croissant        32.000

Tổng cộng:      115.000 ₫
Cảm ơn quý khách!`,
  `BÁCH HÓA XANH
Hóa đơn #BHX-08812
20/05/2026

Mì gói Hảo Hảo x5      30.000
Trứng gà 10 quả        42.000
Rau muống               15.000
Thịt heo nạc 500g      85.000
Nước suối Lavie 1.5L    12.000

Thành tiền:           184.000 ₫`,
  `KFC VIETNAM
Crescent Mall #12
12/05/2026 19:45

Combo Gà Giòn 2 miếng   118.000
Khoai tây chiên size L   45.000
Pepsi 22oz                32.000

Tổng:                   195.000 ₫`,
];

export async function runOCR(file: File): Promise<string> {
  await new Promise((r) => setTimeout(r, 1200));
  // Pick a mock receipt deterministically based on file size so each upload
  // gets a stable result during demos.
  const idx = file.size % MOCK_RECEIPTS.length;
  return MOCK_RECEIPTS[idx];
}
