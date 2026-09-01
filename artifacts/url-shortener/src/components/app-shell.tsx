import { useState, type ReactNode } from 'react';
import { Activity, BarChart3, Check, Clipboard, Command, Link2, Menu, Plus, Radio, Settings2, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck } from '@workspace/api-client-react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, '-')}`}>
      {copied ? <Check size={13} className="text-emerald-600" /> : <Clipboard size={13} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const health = useHealthCheck();

  const navItems = [
    { href: '/', label: 'Overview', icon: BarChart3 },
    { href: '/urls', label: 'All URLs', icon: Link2 },
  ];

  const navigation = (
    <aside className="flex h-full w-[248px] shrink-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
      <div className="flex items-center justify-between px-3">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)} data-testid="link-brand">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Link2 size={19} strokeWidth={2.5} />
          </span>
          <span className="font-extrabold tracking-[-0.04em] text-[19px]">shortstack</span>
        </Link>
        <button type="button" className="rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu">
          <X size={19} />
        </button>
      </div>

      <div className="mt-11 px-3">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">Workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                <span className="flex items-center gap-3"><Icon size={17} /><span>{item.label}</span></span>
                {active && <span className="size-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto">
        <div className="mx-3 mb-4 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-sidebar-foreground/50">
            <span className={`size-1.5 rounded-full ${health.isError ? 'bg-red-400' : 'bg-[#7ed9c0]'}`} />
            System status
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/70">{health.isLoading ? 'Checking signal…' : health.isError ? 'Needs attention' : 'All systems nominal'}</span>
            <Activity size={14} className={health.isError ? 'text-red-400' : 'text-[#7ed9c0]'} />
          </div>
        </div>
        <div className="border-t border-sidebar-border px-3 pt-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-8 place-items-center rounded-full bg-[#7ed9c0]/20 text-xs font-extrabold text-[#a8efdc]">SD</span>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">Signal desk</div>
              <div className="truncate text-[11px] text-sidebar-foreground/45">Developer workspace</div>
            </div>
            <Settings2 size={15} className="ml-auto text-sidebar-foreground/35" />
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="noise min-h-[100dvh] bg-background">
      <div className="flex min-h-[100dvh]">
        <div className="hidden md:block">{navigation}</div>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-foreground/25 md:hidden" onClick={() => setMobileOpen(false)}>
            <div className="h-full" onClick={(event) => event.stopPropagation()}>{navigation}</div>
          </div>
        )}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-10">
            <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <Radio size={13} className="text-primary" />
              <span className="font-mono">edge / us-east-1</span>
              <span className="mx-1 text-border">·</span>
              <span className="text-emerald-700">operational</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-muted-foreground sm:flex">
                <Command size={12} /> K <span className="text-border">/</span> Search
              </div>
              <Link href="/urls/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="link-create-url-header">
                <Plus size={15} strokeWidth={2.5} /> New URL
              </Link>
            </div>
          </header>
          <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary"><span className="size-1.5 rounded-full bg-primary" />{eyebrow}</div>
        <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-foreground md:text-[38px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ onRetry, message = 'We could not load this signal.' }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-8 text-center" data-testid="status-error">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive"><X size={18} /></div>
      <h2 className="mt-3 text-sm font-extrabold">Something interrupted the signal</h2>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold transition-colors hover:bg-muted" data-testid="button-retry">Try again</button>}
    </div>
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-2" data-testid="status-loading">{Array.from({ length: count }).map((_, index) => <div key={index} className="h-[72px] animate-pulse rounded-xl border border-border bg-card/70" />)}</div>;
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return 'No expiration';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', withTime ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function StatusPill({ active, expiresAt }: { active: boolean; expiresAt?: string | null }) {
  const expired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  const label = !active ? 'Disabled' : expired ? 'Expired' : 'Active';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${label === 'Active' ? 'bg-[#d9f2e9] text-[#237355]' : label === 'Expired' ? 'bg-[#f9e7c7] text-[#99631c]' : 'bg-muted text-muted-foreground'}`} data-testid={`status-url-${label.toLowerCase()}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>;
}
