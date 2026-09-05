import { ArrowUpRight, ChevronRight, Link2, MousePointer2, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useGetDashboardSummary } from '@workspace/api-client-react';
import { CopyButton, ErrorState, formatDate, formatNumber, LoadingRows, PageHeader, StatusPill } from '@/components/app-shell';

function StatCard({ label, value, note, icon: Icon, accent }: { label: string; value: string; note: string; icon: typeof Link2; accent: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute right-0 top-0 h-20 w-20 translate-x-7 -translate-y-7 rounded-full opacity-60 ${accent}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-4 text-3xl font-extrabold tracking-[-0.05em]">{value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{note}</div>
        </div>
        <div className="grid size-9 place-items-center rounded-lg bg-muted text-foreground"><Icon size={17} /></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const summaryQuery = useGetDashboardSummary();
  const summary = summaryQuery.data;

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Control room / overview"
        title="Your links, in signal."
        description="A fast read on the links your team trusts to keep moving."
        action={<Link href="/urls/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-extrabold text-secondary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md" data-testid="link-create-url-dashboard"><Plus size={16} /> Create a short URL <ArrowUpRight size={14} /></Link>}
      />

      {summaryQuery.isLoading && <LoadingRows count={2} />}
      {summaryQuery.isError && <ErrorState onRetry={() => summaryQuery.refetch()} />}
      {summary && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="URL summary metrics">
            <StatCard label="Total URLs" value={formatNumber(summary.totalUrls)} note="All mappings in workspace" icon={Link2} accent="bg-[#f7cdbd]" />
            <StatCard label="Active links" value={formatNumber(summary.activeUrls)} note={`${summary.totalUrls ? Math.round((summary.activeUrls / summary.totalUrls) * 100) : 0}% of your URLs`} icon={ShieldCheck} accent="bg-[#ccefe4]" />
            <StatCard label="Total clicks" value={formatNumber(summary.totalClicks)} note="Across every mapping" icon={MousePointer2} accent="bg-[#f4dfaf]" />
            <StatCard label="Signal health" value="Nominal" note="Redirect edge responding" icon={Sparkles} accent="bg-[#d8d8ed]" />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-extrabold tracking-[-0.02em]">Recent URLs</h2>
                  <p className="mt-1 text-xs text-muted-foreground">The latest mappings added to your workspace.</p>
                </div>
                <Link href="/urls" className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-foreground" data-testid="link-view-all-urls">View all <ChevronRight size={14} /></Link>
              </div>
              {summary.recentUrls.length === 0 ? (
                <div className="px-5 py-14 text-center" data-testid="status-empty-recent">
                  <div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Link2 size={20} /></div>
                  <h3 className="mt-3 text-sm font-extrabold">No links yet</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Your first redirect is one good URL away.</p>
                  <Link href="/urls/new" className="mt-4 inline-flex rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground" data-testid="link-create-first-url">Create your first URL</Link>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {summary.recentUrls.slice(0, 6).map((url) => (
                    <div key={url.shortCode} className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50" data-testid={`row-recent-url-${url.shortCode}`}>
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs font-medium text-foreground">{url.shortCode.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/urls/${url.shortCode}`} className="block truncate font-mono text-sm font-medium text-foreground hover:text-primary" data-testid={`link-recent-url-${url.shortCode}`}>{url.shortUrl}</Link>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{url.originalUrl}</div>
                      </div>
                      <div className="hidden shrink-0 items-center gap-5 sm:flex">
                        <div className="text-right"><div className="font-mono text-xs font-medium">{formatNumber(url.clickCount)}</div><div className="mt-1 text-[10px] text-muted-foreground">clicks</div></div>
                        <StatusPill active={url.active} expiresAt={url.expiresAt} />
                        <CopyButton value={url.shortUrl} />
                      </div>
                      <Link href={`/urls/${url.shortCode}`} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" data-testid={`link-open-recent-${url.shortCode}`}><ArrowUpRight size={16} /></Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#243746] bg-[#162631] p-6 text-[#f7f2e7] shadow-md">
              <div className="signal-grid absolute inset-0 opacity-[0.08]" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7ed9c0]"><span className="size-1.5 rounded-full bg-[#7ed9c0]" /> Quick read</div>
                <h2 className="mt-7 max-w-[270px] text-2xl font-extrabold leading-[1.1] tracking-[-0.045em]">Keep the important things short.</h2>
                <p className="mt-4 max-w-[280px] text-sm leading-6 text-[#b1c1c4]">Custom aliases make links easier to remember, share, and audit later.</p>
                <div className="mt-10 border-t border-[#39505b] pt-4">
                  <div className="flex items-center justify-between text-xs"><span className="text-[#91a5aa]">Latest mapping</span><span className="font-mono text-[#f7f2e7]">{summary.recentUrls[0] ? formatDate(summary.recentUrls[0].createdAt) : '—'}</span></div>
                  <Link href="/urls/new" className="mt-5 flex w-full items-center justify-between rounded-lg bg-[#f7f2e7] px-3.5 py-3 text-xs font-extrabold text-[#162631] transition-transform hover:-translate-y-0.5" data-testid="link-quick-create">Shorten a URL <ArrowUpRight size={15} /></Link>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
