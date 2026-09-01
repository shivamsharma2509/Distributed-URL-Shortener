import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CircleHelp, Link2, LoaderCircle, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardSummaryQueryKey, getListUrlsQueryKey, useCreateUrl, type Url } from '@workspace/api-client-react';
import { CopyButton, PageHeader } from '@/components/app-shell';

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function NewUrl() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createUrl = useCreateUrl();
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Url | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidUrl(originalUrl)) {
      setError('Enter a complete http:// or https:// URL.');
      return;
    }
    if (customAlias && !/^[A-Za-z0-9_-]{3,32}$/.test(customAlias)) {
      setError('Aliases use 3–32 letters, numbers, hyphens, or underscores.');
      return;
    }
    setError('');
    createUrl.mutate({ data: { originalUrl, customAlias: customAlias || null, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null } }, {
      onSuccess: (url) => {
        setCreated(url);
        queryClient.invalidateQueries({ queryKey: getListUrlsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (mutationError) => {
        const apiMessage = mutationError as { message?: string };
        setError(apiMessage.message || 'That URL could not be created. Check the details and try again.');
      },
    });
  };

  if (created) {
    return (
      <div className="mx-auto max-w-[720px] animate-enter">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground" data-testid="link-back-dashboard"><ArrowLeft size={15} /> Back to overview</Link>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="relative bg-[#162631] px-7 py-10 text-[#f7f2e7] md:px-10">
            <div className="signal-grid absolute inset-0 opacity-[0.08]" />
            <div className="relative">
              <div className="grid size-11 place-items-center rounded-xl bg-[#7ed9c0] text-[#162631]"><Check size={22} strokeWidth={3} /></div>
              <div className="mt-7 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7ed9c0]">Redirect ready</div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Your link is live.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#b1c1c4]">It is already available at the edge. Copy it, share it, or inspect its first signals.</p>
            </div>
          </div>
          <div className="p-7 md:p-10">
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">Short URL</div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="break-all font-mono text-lg font-medium text-foreground" data-testid="text-created-short-url">{created.shortUrl}</span>
                <CopyButton value={created.shortUrl} label="Copy link" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href={`/urls/${created.shortCode}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-view-created-url">View URL details <ArrowUpRight size={15} /></Link>
              <Link href="/urls/new" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-3 text-xs font-extrabold transition-colors hover:bg-muted" data-testid="link-create-another-url">Create another</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Workspace / New mapping" title="Create a short URL" description="Turn a long destination into a link your team can say out loud." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,700px)_280px]">
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 shadow-xs md:p-8" data-testid="form-create-url">
          <div className="mb-8 flex items-center gap-3 border-b border-border pb-6">
            <div className="grid size-10 place-items-center rounded-lg bg-[#f8d4c4] text-foreground"><Link2 size={19} /></div>
            <div><h2 className="text-sm font-extrabold">Link destination</h2><p className="mt-1 text-xs text-muted-foreground">The redirect is created immediately after submission.</p></div>
          </div>
          {error && <div className="mb-5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive" data-testid="status-create-error">{error}</div>}
          <label className="block text-xs font-extrabold" htmlFor="original-url">Original URL <span className="text-primary">*</span></label>
          <div className="relative mt-2"><Link2 size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" /><input id="original-url" type="url" value={originalUrl} onChange={(event) => setOriginalUrl(event.target.value)} placeholder="https://product.example.com/a-long-path" className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" required maxLength={2048} data-testid="input-original-url" /></div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div><label className="text-xs font-extrabold" htmlFor="custom-alias">Custom alias <span className="font-medium text-muted-foreground">(optional)</span></label><div className="mt-2 flex h-11 items-center rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"><span className="border-r border-border px-3 font-mono text-xs text-muted-foreground">/</span><input id="custom-alias" type="text" value={customAlias} onChange={(event) => setCustomAlias(event.target.value)} placeholder="launch-notes" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/60" maxLength={32} data-testid="input-custom-alias" /></div><p className="mt-2 text-[11px] text-muted-foreground">Letters, numbers, hyphens, underscores.</p></div>
            <div><label className="text-xs font-extrabold" htmlFor="expires-at">Expiration <span className="font-medium text-muted-foreground">(optional)</span></label><input id="expires-at" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-expires-at" /><p className="mt-2 text-[11px] text-muted-foreground">The redirect will stop resolving after this time.</p></div>
          </div>
          <div className="mt-9 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end"><Link href="/urls" className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="link-cancel-create">Cancel</Link><button type="submit" disabled={createUrl.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-extrabold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-70" data-testid="button-submit-url">{createUrl.isPending ? <><LoaderCircle size={15} className="animate-spin" /> Creating signal…</> : <>Create short URL <ArrowUpRight size={15} /></>}</button></div>
        </form>
        <div className="hidden lg:block">
          <div className="rounded-xl border border-border bg-muted/60 p-5">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary"><Sparkles size={14} /> Good to know</div>
            <div className="mt-5 space-y-5">
              <div><div className="text-xs font-extrabold">Instant at the edge</div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Shortstack publishes mappings as soon as they are created. No deploy or propagation window.</p></div>
              <div><div className="text-xs font-extrabold">Aliases stay readable</div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Use a small, memorable phrase for links that will travel in docs, tickets, and chat.</p></div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground"><CircleHelp size={15} className="mt-0.5 shrink-0 text-primary" /> You can disable or update expiration anytime from URL details.</div>
        </div>
      </div>
    </div>
  );
}
