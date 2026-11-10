type Tab = { id: string; label: string; count?: number };

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative -mb-px shrink-0 px-4 py-2.5 text-sm font-medium transition ${
              isActive ? "text-brand" : "text-body hover:text-ink"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="ml-1.5 text-xs text-muted">({t.count})</span> : null}
            {isActive ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}
