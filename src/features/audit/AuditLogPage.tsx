import { ComingSoon } from '@/components/common/ComingSoon';
import { Shield } from 'lucide-react';

export function AuditLogPage() {
  return (
    <ComingSoon
      title="Security & Audit Log"
      subtitle="An immutable compliance trail tracking all critical tenant modifications, sales reversals, and permission changes is being developed."
      icon={<Shield className="w-10 h-10 text-primary/70" />}
    />
  );
}
