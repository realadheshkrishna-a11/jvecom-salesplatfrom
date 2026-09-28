import { ComingSoon } from '@/components/common/ComingSoon';
import { DollarSign } from 'lucide-react';

export function CommissionListPage() {
  return (
    <ComingSoon
      title="Commission & Earnings Engine"
      subtitle="Commission formulas, tiered percentage configurations, and monthly payout approval workflows are being developed. Full earnings management is coming soon."
      icon={<DollarSign className="w-10 h-10 text-primary/70" />}
    />
  );
}
