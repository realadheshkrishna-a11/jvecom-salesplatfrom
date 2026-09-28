import { ComingSoon } from '@/components/common/ComingSoon';
import { Gift } from 'lucide-react';

export function BonusListPage() {
  return (
    <ComingSoon
      title="Performance Bonuses"
      subtitle="Tier-based, target-linked, and revenue milestone incentive management is currently under development. Bonus schemes and ledger tracking will be available soon."
      icon={<Gift className="w-10 h-10 text-primary/70" />}
    />
  );
}
