import { ComingSoon } from '@/components/common/ComingSoon';
import { FileText } from 'lucide-react';

export function ReportsPage() {
  return (
    <ComingSoon
      title="Enterprise Reporting & Exports"
      subtitle="Itemized financial audits, employee performance scorecards, and CSV spreadsheet generation are being finalized for launch."
      icon={<FileText className="w-10 h-10 text-primary/70" />}
    />
  );
}
