import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Building2, Save } from 'lucide-react';

export function SettingsPage() {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();

  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (!organization) return;

    setOrgName(organization.name ?? '');
    setEmail(organization.email ?? '');
    setPhone(organization.phone ?? '');
    setCountry(organization.country ?? '');
    setWebsite(organization.website ?? '');
    setAddress(organization.address ?? '');
  }, [organization]);

  const handleSaveOrg = async () => {
    if (!organization?.id) {
      toastError('No organization found', 'Please sign in to a valid organization before saving settings.');
      return;
    }

    setSavingOrg(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          email,
          phone,
          country,
          website,
          address,
        })
        .eq('id', organization.id);

      if (error) throw error;
      success('Settings Updated', 'Organization profile changes saved successfully.');
    } catch (err) {
      toastError('Save Error', 'Could not update organization settings.');
    } finally {
      setSavingOrg(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your organization details connected to Supabase."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Organization Profile
          </CardTitle>
          <CardDescription className="text-xs">
            Update your company details. These values are synced with your Supabase organization record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} className="text-xs" placeholder="Your company name" />
            </div>
            <div className="space-y-1.5">
              <Label>Primary Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="text-xs" placeholder="hello@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="text-xs" placeholder="+1 234 567 8900" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} className="text-xs" placeholder="India" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Website</Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} className="text-xs" placeholder="https://yourcompany.com" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} className="text-xs" placeholder="Street, city, state, country" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={handleSaveOrg} disabled={savingOrg} className="text-xs gap-1.5">
            <Save className="h-3.5 w-3.5" /> {savingOrg ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SettingsPage;
