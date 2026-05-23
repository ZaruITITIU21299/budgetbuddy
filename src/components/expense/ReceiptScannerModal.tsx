import { useState } from 'react';
import { Camera, FileImage, Loader2, RefreshCcw, Upload } from 'lucide-react';
import { Modal, Button, Input, CategoryPill } from '@/components/ui';
import { useUIStore, useAuthStore } from '@/stores';
import { getAIClient } from '@/lib/ai';
import { ReceiptStorage } from '@/lib/storage';
import { validateReceiptFile, readFileAsDataURL, formatVND, parseVNDInput } from '@/lib/utils';
import type { ParsedReceipt } from '@/types';
import toast from 'react-hot-toast';

export function ReceiptScannerModal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const session = useAuthStore((s) => s.session);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [editedTotal, setEditedTotal] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  if (modal !== 'receipt_scanner') return null;

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setParsed(null);
    setEditedTotal(0);
  };

  const handleFile = async (f: File) => {
    const valid = validateReceiptFile(f);
    if (!valid.ok) {
      toast.error(valid.error ?? 'Invalid file');
      return;
    }
    setFile(f);
    setPreview(await readFileAsDataURL(f));
    setStatus('analyzing');
    try {
      // Single vision call — Gemini reads the image and returns structured
      // fields. MockAIClient falls back to a deterministic OCR + text parser.
      const result = await getAIClient().parseReceiptImage(f);
      setParsed(result);
      setEditedTotal(result.total ?? 0);
      setStatus('done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Receipt scan failed');
      setStatus('idle');
    }
  };

  const handleConfirm = async () => {
    let receiptUrl: string | undefined;

    // Upload the receipt to storage (Supabase bucket or local data URL).
    if (file && session) {
      setUploading(true);
      try {
        receiptUrl = await ReceiptStorage.upload(session.userId, file);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Receipt upload failed');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    } else if (preview) {
      receiptUrl = preview;
    }

    openModal('expense_form', {
      defaultGroupId: undefined,
      initial: {
        title: parsed?.merchant ?? 'Receipt',
        amount: editedTotal,
        category: parsed?.categoryHint ?? 'other',
        note: parsed?.items.map((i) => `${i.name} — ${formatVND(i.price)}`).join('\n'),
        receiptUrl,
      },
    });
  };

  return (
    <Modal
      open
      onClose={close}
      size="md"
      title="Scan Receipt"
      subtitle="Snap or upload a receipt — we'll extract the merchant, date, and total."
      footer={
        status === 'done' ? (
          <>
            <Button variant="ghost" leftIcon={<RefreshCcw className="size-4" />} onClick={reset}>
              Try another
            </Button>
            <Button variant="primary" loading={uploading} onClick={handleConfirm}>
              Continue to Expense
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {!file && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all p-6 flex flex-col items-center gap-3 text-center">
              <div className="size-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <Camera className="size-6 text-emerald-300" />
              </div>
              <div>
                <p className="font-bold text-white">Use Camera</p>
                <p className="text-xs text-slate-400 mt-0.5">Best on mobile</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
              />
            </label>
            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all p-6 flex flex-col items-center gap-3 text-center">
              <div className="size-12 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                <Upload className="size-6 text-sky-300" />
              </div>
              <div>
                <p className="font-bold text-white">Upload File</p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP, PDF (≤ 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {file && (
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start">
            {preview ? (
              <img
                src={preview}
                alt="Receipt"
                className="w-full sm:w-[140px] aspect-[3/4] object-cover rounded-2xl border border-white/10"
              />
            ) : (
              <div className="w-full sm:w-[140px] aspect-[3/4] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FileImage className="size-8 text-slate-500" />
              </div>
            )}
            <div className="space-y-3">
              {status === 'analyzing' && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="size-4 animate-spin text-emerald-300" />
                  Analysing receipt with AI vision…
                </div>
              )}

              {status === 'done' && parsed && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Merchant"
                      value={parsed.merchant ?? ''}
                      readOnly
                    />
                    <Input
                      label="Date"
                      value={parsed.date ?? '—'}
                      readOnly
                    />
                  </div>
                  <Input
                    label="Total"
                    inputMode="numeric"
                    value={editedTotal > 0 ? editedTotal.toLocaleString('de-DE') : ''}
                    onChange={(e) => setEditedTotal(parseVNDInput(e.target.value))}
                    hint="Edit if OCR misread the total. We'll log this as feedback."
                  />
                  {parsed.categoryHint && (
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-1.5">Suggested Category</p>
                      <CategoryPill category={parsed.categoryHint} />
                    </div>
                  )}
                  {parsed.items.length > 0 && (
                    <details className="rounded-xl bg-white/[0.02] border border-white/5 px-3 py-2">
                      <summary className="text-xs font-semibold text-slate-300 cursor-pointer">
                        {parsed.items.length} line items
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-slate-400">
                        {parsed.items.map((it, idx) => (
                          <li key={idx} className="flex justify-between gap-2">
                            <span className="truncate">{it.name}</span>
                            <span className="font-semibold text-slate-200 shrink-0">{formatVND(it.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
