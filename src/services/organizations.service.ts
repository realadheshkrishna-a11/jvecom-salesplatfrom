// ============================================================================
// SalesOS — Organizations Service
// Organization Profile, multi-tenancy settings, and tenant configuration
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Organization, OrganizationSettings } from '@/types';
import type { OrganizationInput } from '@/schemas';

export const organizationsService = {
  async getById(id: string): Promise<Organization> {
    if (isLocalStorageMode()) {
      const org = localDb.getById<Organization>('organization', id);
      if (!org) throw new Error('Organization not found');
      return org;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Organization;
  },

  async update(id: string, input: Partial<OrganizationInput>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Organization;
  },

  async getSettings(orgId: string): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('setting_key, setting_value')
      .eq('organization_id', orgId);

    if (error) throw error;
    const settings: Record<string, unknown> = {};
    (data || []).forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  },

  async setSetting(orgId: string, key: string, value: unknown): Promise<OrganizationSettings> {
    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: orgId,
        setting_key: key,
        setting_value: value as string,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,setting_key' })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as OrganizationSettings;
  }
};
