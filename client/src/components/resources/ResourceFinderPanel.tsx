import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client";
import type { Resource, ResourceLinkedType } from "../../core/types";
import { ResourceCard } from "./ResourceCard";
import { ResourceSearchModal } from "./ResourceSearchModal";
import { Search } from "lucide-react";

interface ResourceFinderPanelProps {
  linkedType: ResourceLinkedType;
  linkedId: string;
  title: string;
  composer?: string;
}

export function ResourceFinderPanel({
  linkedType,
  linkedId,
  title,
  composer,
}: ResourceFinderPanelProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    api
      .getResources({ linked_type: linkedType, linked_id: linkedId })
      .then((d) => setResources(d as Resource[]))
      .catch(() => {});
  }, [linkedType, linkedId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    await api.deleteResource(id);
    load();
  };

  const defaultQuery = `${title} ${composer || ""}`.trim();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--pf-text-secondary)]">
          Resources
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs text-[var(--pf-accent-teal)] hover:underline"
        >
          <Search size={12} /> Find
        </button>
      </div>

      {resources.length === 0 && (
        <p className="text-xs text-[var(--pf-text-secondary)]">
          No resources linked.
        </p>
      )}

      <div className="space-y-0.5">
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r} onDelete={handleDelete} />
        ))}
      </div>

      {showModal && (
        <ResourceSearchModal
          linkedType={linkedType}
          linkedId={linkedId}
          defaultQuery={defaultQuery}
          onClose={() => setShowModal(false)}
          onLinked={() => {
            load();
          }}
        />
      )}
    </div>
  );
}
