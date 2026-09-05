import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Filter, Link2, MoreHorizontal, Search, Trash2, X } from 'lucide-react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardSummaryQueryKey, getGetUrlQueryKey, getListUrlsQueryKey, getGetUrlStatsQueryKey, useDeleteUrl, useListUrls, useUpdateUrl, type StatusParameter } from '@workspace/api-client-react';
import { CopyButton, ErrorState, formatDate, formatNumber, LoadingRows, PageHeader, StatusPill } from '@/components/app-shell';

const statuses: Array<{ value: StatusParameter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'expired', label: 'Expired' },
];

export default function Urls() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusParameter>('all');
  const [page, setPage] = useState(0);
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search); setPage(0); }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = { search: query || undefined, status, page, pageSize: 10 };
  const urlsQuery = useListUrls(params);
  const updateUrl = useUpdateUrl();
  const deleteUrl = useDeleteUrl();
  const data = urlsQuery.data;

  const refreshEverything = () => {
    queryClient.invalidateQueries({ queryKey: getListUrlsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const toggleActive = (shortCode: string, active: boolean) => {
    updateUrl.mutate({ shortCode, data: { active } }, {
      onSuccess: () => { setFeedback(active ? 'URL re-enabled.' : 'URL disabled.'); refreshEverything(); },
      onError: () => setFeedback('Could not update this URL. Try again.'),
    });
  };

  const removeUrl = (shortCode: string) => {
    if (!window.confirm(`Delete ${shortCode}? This will disable the redirect.`)) return;
    deleteUrl.mutate({ shortCode }, {
      onSuccess: () => { setFeedback('URL deleted.'); refreshEverything(); },
      onError: () => setFeedback('Could not delete this URL. Try again.'),
    });
  };

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Workspace / URLs" title="All URLs" description="Search, inspect, and keep every redirect in working order." />
      {feedback && <div className="mb-5 flex items-center justify-between rounded-lg border border-[#b8dfd1] bg-[#e5f5ef] px-4 py-3 text-xs font-semibold text-[#237355]" data-testid="status-feedback"><span>{feedback}</span><button type="button" onClick={() => setFeedback('')} data-testid="button-dismiss-feedback"><X size={14} /></button></div>}

      <div className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative min-w-0 flex-1 md:max-w-[420px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search short codes or destinations…" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-search-urls" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select value={status} onChange={(event) => { setStatus(event.target.value as StatusParameter); setPage(0); }} className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="select-status-filter">
              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {data && <span className="ml-auto hidden text-xs text-muted-foreground sm:block" data-testid="text-url-count">{formatNumber(data.totalItems)} {data.totalItems === 1 ? 'mapping' : 'mappings'}</span>}
          </div>
        </div>

        {urlsQuery.isLoading && <div className="p-4"><LoadingRows count={6} /></div>}
        {urlsQuery.isError && <div className="p-4"><ErrorState onRetry={() => urlsQuery.refetch()} /></div>}
        {data && data.items.length === 0 && (
          <div className="px-5 py-16 text-center" data-testid="status-empty-urls">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground"><Link2 size={21} /></div>
            <h2 className="mt-4 text-sm font-extrabold">{query ? 'No matches in the stack' : 'The stack is empty'}</h2>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{query ? 'Try another code or destination, or clear your search.' : 'Create a short URL to start routing traffic.'}</p>
            {query ? <button type="button" onClick={() => setSearch('')} className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted" data-testid="button-clear-search">Clear search</button> : <Link href="/urls/new" className="mt-4 inline-flex rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground" data-testid="link-create-empty-url">Create URL</Link>}
          </div>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead><tr className="border-b border-border text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground"><th className="px-5 py-3.5">Short URL</th><th className="px-4 py-3.5">Destination</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5 text-right">Clicks</th><th className="px-4 py-3.5">Created</th><th className="w-24 px-5 py-3.5 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-border/70">
                  {data.items.map((url) => (
                    <tr key={url.shortCode} className="group transition-colors hover:bg-muted/45" data-testid={`row-url-${url.shortCode}`}>
                      <td className="px-5 py-4"><Link href={`/urls/${url.shortCode}`} className="flex w-fit items-center gap-2 font-mono text-sm font-medium text-foreground hover:text-primary" data-testid={`link-url-${url.shortCode}`}><span className="grid size-7 place-items-center rounded-md bg-muted text-[10px] font-bold">{url.shortCode.slice(0, 2).toUpperCase()}</span>{url.shortUrl.replace(/^https?:\/\//, '')}</Link></td>
                      <td className="max-w-[280px] px-4 py-4"><a href={url.originalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-primary" data-testid={`link-destination-${url.shortCode}`}><span className="truncate">{url.originalUrl}</span><ExternalLink size={12} className="shrink-0" /></a></td>
                      <td className="px-4 py-4"><StatusPill active={url.active} expiresAt={url.expiresAt} /></td>
                      <td className="px-4 py-4 text-right font-mono text-xs font-medium">{formatNumber(url.clickCount)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{formatDate(url.createdAt)}</td>
                      <td className="px-5 py-4"><div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100"><CopyButton value={url.shortUrl} label="Copy" /><button type="button" title={url.active ? 'Disable URL' : 'Enable URL'} onClick={() => toggleActive(url.shortCode, !url.active)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" disabled={updateUrl.isPending} data-testid={`button-toggle-url-${url.shortCode}`}><MoreHorizontal size={16} /></button><button type="button" title="Delete URL" onClick={() => removeUrl(url.shortCode)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" disabled={deleteUrl.isPending} data-testid={`button-delete-url-${url.shortCode}`}><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border/70 md:hidden">
              {data.items.map((url) => (
                <div key={url.shortCode} className="p-4" data-testid={`card-url-${url.shortCode}`}>
                  <div className="flex items-start justify-between gap-3"><Link href={`/urls/${url.shortCode}`} className="min-w-0 font-mono text-sm font-medium hover:text-primary" data-testid={`link-mobile-url-${url.shortCode}`}>{url.shortUrl.replace(/^https?:\/\//, '')}</Link><StatusPill active={url.active} expiresAt={url.expiresAt} /></div>
                  <div className="mt-2 truncate text-xs text-muted-foreground">{url.originalUrl}</div>
                  <div className="mt-4 flex items-center justify-between"><span className="font-mono text-xs"><strong>{formatNumber(url.clickCount)}</strong> <span className="text-muted-foreground">clicks</span></span><div className="flex items-center gap-1"><CopyButton value={url.shortUrl} /><button type="button" onClick={() => toggleActive(url.shortCode, !url.active)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" data-testid={`button-mobile-toggle-${url.shortCode}`}><MoreHorizontal size={16} /></button><button type="button" onClick={() => removeUrl(url.shortCode)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-mobile-delete-${url.shortCode}`}><Trash2 size={15} /></button></div></div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
              <span className="text-xs text-muted-foreground" data-testid="text-pagination">Page {data.page + 1} of {Math.max(data.totalPages, 1)}</span>
              <div className="flex items-center gap-1"><button type="button" disabled={data.page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35" data-testid="button-previous-page"><ChevronLeft size={15} /></button><button type="button" disabled={data.page + 1 >= data.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35" data-testid="button-next-page"><ChevronRight size={15} /></button></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
