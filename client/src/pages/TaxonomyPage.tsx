import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import type { TaxonomyCategory } from '../core/types';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface TreeNode extends TaxonomyCategory {
  children: TreeNode[];
  expanded?: boolean;
}

function buildTree(categories: TaxonomyCategory[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CategoryNode({
  node, depth, onEdit, onDelete, expanded, onToggle
}: {
  node: TreeNode; depth: number; onEdit: (cat: TaxonomyCategory) => void; onDelete: (id: string) => void;
  expanded: Set<string>; onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 sm:py-1.5 px-2 hover:bg-[var(--pf-bg-hover)] rounded-pf-sm group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => onToggle(node.id)} className="p-2 sm:p-0.5 text-[var(--pf-text-secondary)]">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="flex-1 text-sm font-medium">{node.name}</span>
        {hasChildren && (
          <Badge color="var(--pf-text-secondary)" className="mr-2">{node.children.length}</Badge>
        )}
        <div className="flex sm:hidden sm:group-hover:flex items-center gap-1">
          <button onClick={() => onEdit(node)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Pencil size={14} /></button>
          <button onClick={() => onDelete(node.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
        </div>
      </div>
      {isExpanded && node.children
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(child => (
          <CategoryNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} expanded={expanded} onToggle={onToggle} />
        ))}
    </div>
  );
}

export function TaxonomyPage() {
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formParent, setFormParent] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const load = useCallback(() => {
    api.getTaxonomy().then(data => setCategories(data as TaxonomyCategory[])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const tree = buildTree(categories);
  const topLevel = categories.filter(c => !c.parent_id);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(categories.map(c => c.id)));
  const collapseAll = () => setExpanded(new Set());

  const openAdd = (parentId?: string) => {
    setEditingId(null);
    setFormName('');
    setFormParent(parentId || '');
    setFormDesc('');
    setShowForm(true);
  };

  const openEdit = (cat: TaxonomyCategory) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormParent(cat.parent_id || '');
    setFormDesc(cat.description || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    const data = { name: formName, parent_id: formParent || null, description: formDesc };
    if (editingId) {
      await api.updateCategory(editingId, data);
    } else {
      await api.createCategory(data);
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteCategory(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={expandAll}>Expand all</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse all</Button>
          <Button size="sm" onClick={() => openAdd()}>
            <Plus size={16} /> Add category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="py-2">
              {tree.sort((a, b) => a.sort_order - b.sort_order).map(node => (
                <CategoryNode key={node.id} node={node} depth={0} onEdit={openEdit} onDelete={handleDelete} expanded={expanded} onToggle={toggle} />
              ))}
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{editingId ? 'Edit Category' : 'New Category'}</h2>
                <button onClick={() => setShowForm(false)} className="text-[var(--pf-text-secondary)]"><X size={18} /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Flutter Tonguing" />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--pf-text-secondary)]">Parent category</label>
                <select
                  value={formParent}
                  onChange={e => setFormParent(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
                >
                  <option value="">None (top-level)</option>
                  {topLevel.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description" />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!formName.trim()}>
                  <Check size={14} /> {editingId ? 'Save' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
