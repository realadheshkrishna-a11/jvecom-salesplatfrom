import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { localDb, isLocalStorageMode, setStorageMode } from '@/lib/localDb';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  Building2, Database, Shield, Mail, Bell, RotateCcw,
  CheckCircle2, Sparkles, Key, Globe, DollarSign, Save
} from 'lucide-react';
import { emailService } from '@/services/email.service';

export function SettingsPage() {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();

  // Org Form State
  const [orgName, setOrgName] = useState(organization?.name || 'Acme Learning Technologies');
  const [email, setEmail] = useState(organization?.email || 'contact@acmelearning.io');
  const [phone, setPhone] = useState(organization?.phone || '+91 80 1234 5678');
  const [currency, setCurrency] = useState(organization?.currency || 'INR');
  const [industry, setIndustry] = useState(organization?.industry || 'EdTech & Corporate Training');
  const [timezone, setTimezone] = useState(organization?.timezone || 'Asia/Kolkata');
  const [website, setWebsite] = useState(organization?.website || 'https://acmelearning.io');
  const [address, setAddress] = useState(organization?.address || 'Indiranagar 100ft Rd, Bangalore');
  const [savingOrg, setSavingOrg] = useState(false);

  // Email Config State
  const [resendKey, setResendKey] = useState(() => localStorage.getItem('salesos_resend_api_key') || '');
  const [senderName, setSenderName] = useState(() => localStorage.getItem('salesos_from_name') || 'Jvecom Sales');
  const [fromEmail, setFromEmail] = useState(() => {
    const saved = localStorage.getItem('salesos_from_address');
    if (!saved || saved === 'onboarding@resend.dev' || saved === 'noreply@crm.jvecom.com') {
      return 'noreply@crm.jvecomb2b.com';
    }
    return saved;
  });

  // Policy & Notification Toggles
  const [require2FA, setRequire2FA] = useState(false);
  const [autoApproveDeals, setAutoApproveDeals] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [emailOnWonDeal, setEmailOnWonDeal] = useState(true);

  // Storage Mode
  const [storageMode, setStorageModeState] = useState<'local' | 'supabase'>(isLocalStorageMode() ? 'local' : 'supabase');

  const handleSaveOrg = () => {
    setSavingOrg(true);
    try {
      if (organization?.id) {
        localDb.update('organization', organization.id, {
          name: orgName,
          email,
          phone,
          currency,
          industry,
          timezone,
          website,
          address,
        } as any);
      }
      success('Settings Updated', 'Organization profile changes saved successfully.');
    } catch (err) {
      toastError('Save Error', 'Could not update organization settings.');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveEmail = () => {
    const key = resendKey.trim();
    const name = senderName.trim() || 'Jvecom Sales';
    const emailAddr = fromEmail.trim() || 'noreply@crm.jvecomb2b.com';
    localStorage.setItem('salesos_resend_api_key', key);
    localStorage.setItem('salesos_from_name', name);
    localStorage.setItem('salesos_from_address', emailAddr);
    emailService.saveSettings({
      resend_api_key: key,
      from_name: name,
      from_address: emailAddr,
    });
    success('Integrations Saved', 'Email gateway settings updated.');
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all CRM and demo data back to clean factory seed values? This action cannot be undone.')) {
      localDb.resetToSeed();
      localStorage.removeItem('salesos_demo_emails');
      localStorage.removeItem('salesos_threads');
      success('Database Reset', 'Clean demo data seeded. Reloading workspace...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleSwitchStorage = (mode: 'local' | 'supabase') => {
    setStorageMode(mode);
    setStorageModeState(mode);
    success('Engine Switched', `Active persistence mode set to ${mode === 'local' ? 'LocalStorage Engine' : 'Supabase Cloud'}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings &amp; Platform Configuration"
        subtitle="Manage company information, database engine parameters, email delivery gateways, and security policies."
      />

      <Tabs defaultValue="org" className="space-y-4">
        <TabsList className="grid w-full sm:w-auto grid-cols-4">
          <TabsTrigger value="org" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Organization
          </TabsTrigger>
          <TabsTrigger value="engine" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" /> Database &amp; Demo
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 text-xs">
            <Mail className="h-3.5 w-3.5" /> Email Gateway
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Security &amp; Alerts
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Organization Settings */}
        <TabsContent value="org">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company &amp; Tenant Profile</CardTitle>
              <CardDescription className="text-xs">
                General organizational metadata visible on customer receipts, invoices, and email headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company Name</Label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Industry</Label>
                  <Input value={industry} onChange={e => setIndustry(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Corporate Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Support Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Default Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="AED">AED (د.إ) - UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST +4:00)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST -5:00)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT +0:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Official Website</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Headquarters Address</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} className="text-xs" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
              <Button size="sm" onClick={handleSaveOrg} disabled={savingOrg} className="text-xs gap-1.5">
                <Save className="h-3.5 w-3.5" /> {savingOrg ? 'Saving...' : 'Save Company Profile'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 2: Database & Demo Engine */}
        <TabsContent value="engine">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Database Engine &amp; Data Reset</CardTitle>
              <CardDescription className="text-xs">
                Control client-side local database emulation and factory seed re-population.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Full Platform Interactive Mode</p>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    All CRM workflows, sales deals, commissions, performance bonuses, employee directories, and email inboxes are 100% active and functional. Changes persist across browser sessions in local storage.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Active Persistence Layer</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => handleSwitchStorage('local')}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      storageMode === 'local'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">LocalStorage Engine (Offline Ready)</span>
                      {storageMode === 'local' && <Badge className="text-[10px]">Active</Badge>}
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Instant CRUD performance with zero latency. Pre-seeded with realistic leads, deals, metrics, and commissions.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSwitchStorage('supabase')}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      storageMode === 'supabase'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">Supabase Cloud PostgreSQL</span>
                      {storageMode === 'supabase' && <Badge className="text-[10px]">Active</Badge>}
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Remote cloud synchronization. Requires live Supabase credentials configured in .env file.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Label className="text-sm font-semibold text-destructive block mb-1">Factory Reset Demo Workspace</Label>
                <p className="text-muted-foreground mb-3 leading-relaxed">
                  Clear all mutated leads, sales records, custom commission rules, and re-populate the standard clean Acme Learning Technologies demonstration dataset.
                </p>
                <Button variant="destructive" size="sm" onClick={handleResetData} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset All Demo Data to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Email Gateway Integration */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Delivery &amp; Resend Gateway</CardTitle>
              <CardDescription className="text-xs">
                Configure outbound email dispatch credentials for customer communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label>Resend API Key (Optional for Live Outbound)</Label>
                <Input
                  type="password"
                  value={resendKey}
                  onChange={e => setResendKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxx"
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave empty to use the built-in local simulator. Outgoing emails will automatically save to your Sent folder and update contact records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sender Name</Label>
                  <Input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Jvecom Sales"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sender Email Address</Label>
                  <Input
                    value={fromEmail}
                    onChange={e => setFromEmail(e.target.value)}
                    placeholder="noreply@crm.jvecomb2b.com"
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border pt-4">
              <Button size="sm" onClick={handleSaveEmail} className="text-xs gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save Gateway Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 4: Security & Preferences */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Policies &amp; User Experience</CardTitle>
              <CardDescription className="text-xs">
                Compliance rules and UI interaction preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <span className="font-semibold text-foreground block">Two-Factor Authentication (2FA)</span>
                  <span className="text-muted-foreground text-[11px]">Enforce OTP verification upon sign-in</span>
                </div>
                <Button
                  variant={require2FA ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRequire2FA(!require2FA)}
                  className="text-xs"
                >
                  {require2FA ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <span className="font-semibold text-foreground block">Auto-Accrue Commission on Deal Won</span>
                  <span className="text-muted-foreground text-[11px]">Instantly calculate commission ledger entry when sale is finalized</span>
                </div>
                <Button
                  variant={autoApproveDeals ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoApproveDeals(!autoApproveDeals)}
                  className="text-xs"
                >
                  {autoApproveDeals ? 'Active' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <span className="font-semibold text-foreground block">Celebratory Deal Audio &amp; XP Feedback</span>
                  <span className="text-muted-foreground text-[11px]">Trigger micro-animations and sound when deals are won</span>
                </div>
                <Button
                  variant={soundEffects ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSoundEffects(!soundEffects)}
                  className="text-xs"
                >
                  {soundEffects ? 'Enabled' : 'Muted'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default SettingsPage;
