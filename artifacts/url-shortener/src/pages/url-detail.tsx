import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, ArrowUpRight, CalendarClock, Clock3, ExternalLink, LoaderCircle, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardSummaryQueryKey, getGetUrlQueryKey, getGetUrlStatsQueryKey, getListUrlsQueryKey, useDeleteUrl, useGetUrl, useGetUrlStats, useUpdateUrl } from '@workspace/api-client-react';
import { CopyButton, ErrorState, formatDate, formatNumber, PageHeader, StatusPill } from '@/components/app-shell';

function localDateInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function UrlDetail() {
  const { shortCode: routeCode } = useParams<{ shortCode: string }>();
  const shortCode = routeCode ?? '';
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const urlQuery = useGetUrl(shortCode, { query: { enabled: !!shortCode, queryKey: getGetUrlQueryKey(shortCode) } });
  const statsQuery = useGetUrlStats(shortCode, { query: { enabled: !!shortCode, queryKey: getGetUrlStatsQueryKey(shortCode) } });
  const updateUrl = useUpdateUrl();
  const deleteUrl = useDeleteUrl();
  const [expiresAt, setExpiresAt] = useState('');
  const [editingExpiration, setEditingExpiration] = useState(false);
  const [feedback, setFeedback] = useState('');
  const url = urlQuery.data;
  const stats = statsQuery.data;

  useEffect(() => {
    if (url) setExpiresAt(localDateInput(url.expiresAt));
  }, [url]);

  const patchCache = (updated: typeof url) => {
    if (!updated) return;
    queryClient.setQueryData(getGetUrlQueryKey(shortCode), updated);
    queryClient.setQueryData(getGetUrlStatsQueryKey(shortCode), (old: typeof stats) => old ? { ...old, active: updated.active, expiresAt: updated.expiresAt } : old);
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListUrlsQueryKey() });
  };

  const toggle = () => {
    if (!url) return;
    updateUrl.mutate({ shortCode, data: { active: !url.active } }, {
      onSuccess: (updated) => { patchCache(updated); setFeedback(updated.active ? 'Redirect enabled.' : 'Redirect disabled.'); },
      onError: () => setFeedback('Could not update the redirect. Try again.'),
    });
  };

  const saveExpiration = () => {
    updateUrl.mutate({ shortCode, data: { expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null } }, {
      onSuccess: (updated) => { patchCache(updated); setEditingExpiration(false); setFeedback('Expiration updated.'); },
      onError: () => setFeedback('Could not update expiration. Try again.'),
    });
  };

  const remove = () => {
    if (!window.confirm(`Delete ${shortCode}? This will disable the redirect.`)) return;
    deleteUrl.mutate({ shortCode }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListUrlsQueryKey() });
        setLocation('/urls');
      },
      onError: () => setFeedback('Could not delete this URL. Try again.'),
    });
  };

  if (urlQuery.isLoading) {
    return <div className="animate-pulse"><div className="h-4 w-28 rounded bg-muted" /><div className="mt-8 h-10 w-72 rounded bg-muted" /><div className="mt-8 h-64 rounded-xl border border-border bg-card" /></div>;
  }
  if (urlQuery.isError || !url) return <ErrorState onRetry={() => urlQuery.refetch()} message="This URL may have been removed or is temporarily unreachable." />;

  return (
    <div className="animate-enter">
      <Link href="/urls" className="mb-7 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground" data-testid="link-back-urls"><ArrowLeft size={15} /> Back to all URLs</Link>
      <PageHeader eyebrow={`URL / ${url.shortCode}`} title={url.shortUrl.replace(/^https?:\/\//, '')} description={url.originalUrl} action={<div className="flex flex-wrap items-center gap-2"><CopyButton value={url.shortUrl} label="Copy link" /><a href={url.originalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-extrabold transition-colors hover:bg-muted" data-testid="link-open-destination">Open destination <ExternalLink size={14} /></a></div>} />
      {feedback && <div className="mb-5 rounded-lg border border-[#b8dfd1] bg-[#e5f5ef] px-4 py-3 text-xs font-semibold text-[#237355]" data-testid="status-detail-feedback">{feedback}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs md:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-3"><h2 className="text-sm font-extrabold">Usage at a glance</h2><StatusPill active={url.active} expiresAt={url.expiresAt} /></div><p className="mt-1 text-xs text-muted-foreground">Live telemetry for this redirect.</p></div><button type="button" onClick={() => { void statsQuery.refetch(); void urlQuery.refetch(); }} className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-refresh-stats"><RefreshCw size={13} className={statsQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#f8d4c4]/55 p-4"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground"><Activity size={13} /> Total clicks</div><div className="mt-3 font-mono text-3xl font-medium tracking-[-0.06em]" data-testid="text-detail-click-count">{formatNumber(stats?.clickCount ?? url.clickCount)}</div></div>
              <div className="rounded-lg bg-[#d9f2e9] p-4"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#237355]"><CalendarClock size={13} /> Expiration</div><div className="mt-3 text-sm font-extrabold text-[#237355]" data-testid="text-detail-expiration">{formatDate(stats?.expiresAt ?? url.expiresAt)}</div></div>
              <div className="rounded-lg bg-muted p-4"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground"><Clock3 size={13} /> Last updated</div><div className="mt-3 text-sm font-extrabold" data-testid="text-detail-updated">{formatDate(stats?.lastUpdatedAt ?? url.updatedAt, true)}</div></div>
            </div>
            <div className="mt-8 border-t border-border pt-5"><div className="flex items-center justify-between"><span className="text-xs font-extrabold">Activity pulse</span><span className="text-[11px] text-muted-foreground">Current total · no historical events</span></div><div className="mt-5 flex h-24 items-end gap-1.5">{[24, 33, 28, 48, 42, 65, 58, 78, 70, 88, 72, 100, 83, 94, 88, 100, 92, 100].map((height, index) => <div key={index} className={`flex-1 rounded-sm transition-all ${index > 13 ? 'bg-primary' : 'bg-[#f3b39b]'}`} style={{ height: `${Math.max(10, (height / 100) * Math.min(100, 40 + (stats?.clickCount ?? url.clickCount) * 4))}%` }} />)}</div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Created {formatDate(url.createdAt)}</span><span>Now</span></div></div>
          </section>
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs md:p-7"><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Destination</div><a href={url.originalUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all font-mono text-sm leading-6 text-foreground hover:text-primary" data-testid="link-detail-original-url">{url.originalUrl}</a><div className="mt-5 flex items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground"><span className="font-bold">Short URL</span><span className="font-mono text-foreground">{url.shortUrl}</span><CopyButton value={url.shortUrl} label="Copy" /></div></section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Redirect controls</h2><p className="mt-1 text-xs text-muted-foreground">Change how this mapping behaves.</p></div><div className={`grid size-9 place-items-center rounded-lg ${url.active ? 'bg-[#d9f2e9] text-[#237355]' : 'bg-muted text-muted-foreground'}`}>{url.active ? <Play size={17} /> : <Pause size={17} />}</div></div><button type="button" onClick={toggle} disabled={updateUrl.isPending} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-extrabold transition-all hover:-translate-y-0.5 disabled:opacity-60 ${url.active ? 'border border-border bg-background text-foreground hover:bg-muted' : 'bg-primary text-primary-foreground'}`} data-testid="button-toggle-detail">{updateUrl.isPending ? <LoaderCircle size={15} className="animate-spin" /> : url.active ? <Pause size={15} /> : <Play size={15} />}{url.active ? 'Disable redirect' : 'Enable redirect'}</button><div className="mt-6 border-t border-border pt-5"><div className="flex items-center justify-between"><div><div className="text-xs font-extrabold">Expiration</div><div className="mt-1 text-[11px] text-muted-foreground">{url.expiresAt ? formatDate(url.expiresAt) : 'Runs indefinitely'}</div></div><button type="button" onClick={() => setEditingExpiration((current) => !current)} className="text-xs font-bold text-primary hover:text-foreground" data-testid="button-edit-expiration">{editingExpiration ? 'Close' : 'Edit'}</button></div>{editingExpiration && <div className="mt-4"><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-detail-expires-at" /><button type="button" onClick={saveExpiration} disabled={updateUrl.isPending} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground disabled:opacity-60" data-testid="button-save-expiration">{updateUrl.isPending && <LoaderCircle size={13} className="animate-spin" />} Save expiration</button></div>}</div></section>
          <section className="rounded-xl border border-destructive/20 bg-destructive/[0.025] p-6"><div className="flex items-start gap-3"><div className="grid size-8 place-items-center rounded-lg bg-destructive/10 text-destructive"><Trash2 size={15} /></div><div><h2 className="text-sm font-extrabold">Danger zone</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Deleting disables this mapping and removes it from normal workspace views.</p></div></div><button type="button" onClick={remove} disabled={deleteUrl.isPending} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-3 py-2.5 text-xs font-extrabold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60" data-testid="button-delete-detail">{deleteUrl.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete URL</button></section>
        </div>
      </div>
    </div>
  );
}
