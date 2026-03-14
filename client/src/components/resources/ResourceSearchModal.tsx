import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import type { ResourceSearchResult, ResourceLinkedType, ResourceType, ResourceSource } from '../../core/types';
import { X, Search, Wand2, ExternalLink, Plus, Loader2 } from 'lucide-react';

interface ResourceSearchModalProps {
  linkedType: ResourceLinkedType;
  linkedId: string;
  defaultQuery: string;
  onClose: () => void;
  onLinked: () => void;
}

type Tab = 'scores' | 'recordings' | 'context' | 'manual';

export function ResourceSearchModal({ linkedType, linkedId, defaultQuery, onClose, onLinked }: ResourceSearchModalProps) {
  const [tab, setTab] = useState<Tab>('scores');
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<ResourceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  // Manual form
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<ResourceType>('other');
  const [manualDesc, setManualDesc] = useState('');

  const searchFn: Record<Tab, ((q: string) => Promise<unknown[]>) | null> = {
    scores: (q) => api.searchImslp(q),
    recordings: (q) => api.searchYoutube(q),
    context: (q) => api.searchWikipedia(q),
    manual: null,
  };

  const doSearch = async () => {
    const fn = searchFn[tab];
    if (!fn || !query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const data = await fn(query.trim());
      setResults(data as ResourceSearchResult[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const doAutoDiscover = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const data = await api.autoDiscover({ title: query.trim() }) as { imslp: ResourceSearchResult[]; wikipedia: ResourceSearchResult[]; youtube: ResourceSearchResult[] };
      setResults([...(data.imslp || []), ...(data.youtube || []), ...(data.wikipedia || [])]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const linkResult = async (result: ResourceSearchResult) => {
    setLinking(result.url);
    try {
      await api.createResource({
        linked_type: linkedType,
        linked_id: linkedId,
        resource_type: result.resource_type,
        title: result.title,
        url: result.url,
        source: result.source,
        description: result.description || '',
        thumbnail_url: result.thumbnail_url || null,
      });
      onLinked();
      // Remove from results
      setResults(r => r.filter(x => x.url !== result.url));
    } catch {}
    setLinking(null);
  };

  const linkManual = async () => {
    if (!manualUrl.trim() || !manualTitle.trim()) return;
    setLinking('manual');
    try {
      await api.createResource({
        linked_type: linkedType,
        linked_id: linkedId,
        resource_type: manualType,
        title: manualTitle.trim(),
        url: manualUrl.trim(),
        source: 'manual' as ResourceSource,
        description: manualDesc,
      });
      onLinked();
      setManualUrl('');
      setManualTitle('');
      setManualDesc('');
    } catch {}
    setLinking(null);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'scores', label: 'Scores' },
    { key: 'recordings', label: 'Recordings' },
    { key: 'context', label: 'Context' },
    { key: 'manual', label: 'Manual' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Find Resources" onClick={onClose}>
      <div
        className="bg-[var(--pf-bg-primary)] border border-[var(--pf-border-color)] rounded-pf w-full max-w-xl max-h-[80vh] flex flex-col shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--pf-border-color)]">
          <h2 className="text-base font-semibold">Find Resources</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--pf-border-color)]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setResults([]); }}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'text-[var(--pf-accent-teal)] border-b-2 border-[var(--pf-accent-teal)]'
                  : 'text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab !== 'manual' ? (
            <>
              {/* Search bar */}
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Search..."
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--pf-bg-secondary)] border border-[var(--pf-border-color)] rounded-pf-sm text-[var(--pf-text-primary)] placeholder:text-[var(--pf-text-secondary)] focus:outline-none focus:border-[var(--pf-accent-teal)]"
                />
                <Button size="sm" onClick={doSearch} disabled={loading}>
                  <Search size={14} /> Search
                </Button>
                <Button size="sm" variant="secondary" onClick={doAutoDiscover} disabled={loading} title="Search all sources">
                  <Wand2 size={14} />
                </Button>
              </div>

              {loading && (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-[var(--pf-text-secondary)]" />
                </div>
              )}

              {!loading && results.length === 0 && (
                <p className="text-xs text-[var(--pf-text-secondary)] text-center py-4">
                  {query ? 'No results. Try a different search.' : 'Enter a search term above.'}
                </p>
              )}

              {results.map((r, i) => (
                <div key={`${r.url}-${i}`} className="flex items-start gap-3 p-2 border border-[var(--pf-border-color)] rounded-pf-sm">
                  {r.thumbnail_url && (
                    <img src={r.thumbnail_url} alt="" className="w-16 h-12 object-cover rounded shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline text-[var(--pf-text-primary)] flex items-center gap-1">
                      {r.title} <ExternalLink size={10} />
                    </a>
                    {r.description && <p className="text-xs text-[var(--pf-text-secondary)] mt-0.5 line-clamp-2">{r.description}</p>}
                    <span className="text-[10px] text-[var(--pf-text-secondary)] uppercase">{r.source}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => linkResult(r)}
                    disabled={linking === r.url}
                    className="shrink-0"
                  >
                    <Plus size={14} /> Link
                  </Button>
                </div>
              ))}
            </>
          ) : (
            /* Manual tab */
            <div className="space-y-3">
              <Input label="URL" value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://..." />
              <Input label="Title" value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Resource title" />
              <Select label="Type" value={manualType} onChange={e => setManualType(e.target.value as ResourceType)}>
                <option value="score">Score</option>
                <option value="recording">Recording</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </Select>
              <Textarea label="Description (optional)" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
              <div className="flex justify-end">
                <Button size="sm" onClick={linkManual} disabled={!manualUrl.trim() || !manualTitle.trim() || linking === 'manual'}>
                  <Plus size={14} /> Add Resource
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
