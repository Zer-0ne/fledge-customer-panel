'use client';

/**
 * Student / Faculty Verification page — mirrors Flutter's `student_verify_screen.dart`.
 *
 * Flow: choose method (ID card / fee receipt) → upload → submit → history.
 * Documents are NOT stored — only OCR-extracted text is saved for verification.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  BadgeCheck,
  FileImage,
  FileText,
  Loader2,
  Shield,
  Upload,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type VerifyMethod = 'STUDENT_ID_CARD' | 'FEE_RECEIPT';

interface Verification {
  id: string;
  status: string;
  method?: string;
  rejectionReason?: string;
  requestedAt?: string;
  verifiedAt?: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  VERIFIED: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Verified' },
  PENDING: { icon: Clock, color: 'text-amber-500', label: 'Under review (up to 24 hours)' },
  ESCALATED: { icon: AlertTriangle, color: 'text-blue-500', label: 'Escalated to human review' },
  REQUIRES_RESUBMISSION: { icon: X, color: 'text-red-500', label: 'Rejected — please resubmit' },
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentVerifyPage() {
  const router = useRouter();
  const [method, setMethod] = React.useState<VerifyMethod>('STUDENT_ID_CARD');
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [verifications, setVerifications] = React.useState<Verification[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Load verification history
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/proxy/api/v1/student-verifications/mine');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        if (!cancelled) setVerifications(list);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    try {
      // 1. Upload media via presigned URL
      const { requestPresignedUpload, uploadToStorage, confirmUploadComplete } = await import('@/lib/api/services/media');
      const upload = await requestPresignedUpload(file, 'verification');
      await uploadToStorage(upload.uploadUrl, file, { method: upload.method, headers: upload.headers });
      await confirmUploadComplete(upload.id);

      // 2. Submit verification
      const res = await fetch('/api/proxy/api/v1/student-verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: upload.id, method }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Submission failed');
      }

      showToast('Verification submitted! We\'ll review it within 24 hours.');
      handleRemoveFile();
      // Reload history
      const historyRes = await fetch('/api/proxy/api/v1/student-verifications/mine');
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setVerifications(Array.isArray(historyData) ? historyData : historyData?.data ?? []);
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {/* Privacy notice */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 flex items-start gap-3">
          <Shield className="size-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            We do NOT store your documents. Only extracted text (name, college, roll no.) is saved for verification.
          </p>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <BadgeCheck className="size-3" />
            Student / Faculty Verification
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Verify your student status
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a student ID card or fee receipt to unlock verified badge.
          </p>
        </div>

        {/* Method selector */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Choose verification method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setMethod('STUDENT_ID_CARD'); handleRemoveFile(); }}
              className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-colors ${
                method === 'STUDENT_ID_CARD'
                  ? 'border-primary/50 bg-primary/5 text-foreground'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              <BadgeCheck className="size-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Student ID Card</p>
                <p className="text-[10px] text-muted-foreground">Photo of your college ID</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setMethod('FEE_RECEIPT'); handleRemoveFile(); }}
              className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-colors ${
                method === 'FEE_RECEIPT'
                  ? 'border-primary/50 bg-primary/5 text-foreground'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              <FileText className="size-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Fee Receipt</p>
                <p className="text-[10px] text-muted-foreground">PDF or image of receipt</p>
              </div>
            </button>
          </div>
        </div>

        {/* Upload area */}
        <div className="space-y-3">
          {!file ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-border/60 bg-card/50 p-8 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Upload className="size-8" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {method === 'STUDENT_ID_CARD' ? 'Upload ID card photo' : 'Upload fee receipt'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {method === 'STUDENT_ID_CARD'
                    ? 'JPG, PNG, or WebP — max 10 MB'
                    : 'PDF, JPG, PNG — max 10 MB'}
                </p>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {preview ? (
                    <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Preview" className="size-full object-cover" />
                    </div>
                  ) : (
                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="size-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          <Button
            onClick={() => void handleSubmit()}
            disabled={!file || submitting}
            className="w-full rounded-xl"
          >
            {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
            Submit for verification
          </Button>
        </div>

        {/* Verification history */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Verification history</p>
          {loadingHistory ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
              <Loader2 className="size-3.5 animate-spin" />
              Loading...
            </div>
          ) : verifications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No verification submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {verifications.map((v) => {
                const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.REQUIRES_RESUBMISSION;
                const Icon = cfg.icon;
                return (
                  <div
                    key={v.id}
                    className="rounded-xl border border-border/60 bg-card p-3.5 flex items-start gap-3"
                  >
                    <Icon className={`size-5 shrink-0 mt-0.5 ${cfg.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                      {v.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5">{v.rejectionReason}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Submitted {formatDate(v.requestedAt)}
                      </p>
                    </div>
                    {v.status === 'REQUIRES_RESUBMISSION' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => { setMethod('STUDENT_ID_CARD'); handleRemoveFile(); }}
                      >
                        <RefreshCw className="size-3" />
                        Re-upload
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={method === 'STUDENT_ID_CARD' ? 'image/*' : 'image/*,.pdf'}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
