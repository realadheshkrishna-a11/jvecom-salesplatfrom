import { ComingSoon } from '@/components/common/ComingSoon';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  return (
    <ComingSoon
      title="Settings & Configuration"
      subtitle="Organization parameters, multi-currency tokens, sales qualification rules, and user preferences are being built. Stay tuned for a comprehensive settings experience."
      icon={<Settings className="w-10 h-10 text-primary/70" />}
    />
  );
}
