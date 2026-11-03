import { RoleGate } from '../components/layout/RoleGate.jsx';
import { MODULES } from '../lib/permissions.js';

// Placeholder for modules delivered in later stages (Phase 11 §2).
export default function ComingSoonPage({ moduleKey }) {
  const module = MODULES.find((item) => item.key === moduleKey);
  return (
    <RoleGate moduleKey={moduleKey}>
      <div className="rounded-card border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink">{module.label}</h1>
        <p className="mt-2 text-muted">
          This section is planned for Stage {module.stage}
          {module.brief && ` (client brief ${module.brief})`}.
        </p>
      </div>
    </RoleGate>
  );
}
