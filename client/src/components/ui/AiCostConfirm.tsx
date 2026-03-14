import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AiCostConfirmProps {
  estimatedCost: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AiCostConfirm({ estimatedCost, description, onConfirm, onCancel }: AiCostConfirmProps) {
  const focusTrapRef = useFocusTrap(true, onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="AI cost confirmation">
      <div ref={focusTrapRef} className="bg-[var(--pf-bg-card)] border border-[var(--pf-border-color)] rounded-pf p-6 max-w-md w-full mx-4 shadow-pf-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-[var(--pf-accent-gold)]/20">
            <AlertTriangle size={20} className="text-[var(--pf-accent-gold)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--pf-text-primary)]">AI API Cost</h3>
        </div>
        <p className="text-sm text-[var(--pf-text-secondary)] mb-2">{description}</p>
        <p className="text-sm font-medium text-[var(--pf-text-primary)] mb-6">
          Estimated cost: <span className="text-[var(--pf-accent-gold)]">{estimatedCost}</span>
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
