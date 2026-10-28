import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Sale, Profile, Customer, Team } from '@/types';
import { PaymentStatus } from '@/types';

export interface ReportFilterOptions {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  teamId?: string;
  productId?: string;
}

export const reportsService = {
  exportCSV<T extends object>(data: T[], filename: string): void {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async getSalesReport(orgId: string, filters: ReportFilterOptions = {}) {
    if (isLocalStorageMode()) {
      let sales = localDb.getAll<Sale>('sales');
      const customers = localDb.getAll<Customer>('customers');
      const profiles = localDb.getAll<Profile>('profiles');
      const teams = localDb.getAll<Team>('teams');

      if (filters.userId) sales = sales.filter(s => s.user_id === filters.userId);
      if (filters.teamId) sales = sales.filter(s => s.team_id === filters.teamId);
      if (filters.dateFrom) sales = sales.filter(s => s.sale_date >= filters.dateFrom!);
      if (filters.dateTo) sales = sales.filter(s => s.sale_date <= filters.dateTo!);

      return sales.map(s => {
        const cust = customers.find(c => c.id === s.customer_id);
        const user = profiles.find(p => p.id === s.user_id);
        const team = teams.find(t => t.id === s.team_id);
        return {
          Invoice: s.invoice_number,
          Date: s.sale_date ? new Date(s.sale_date).toLocaleDateString() : '',
          Customer: cust ? `${cust.first_name} ${cust.last_name}` : 'Direct Customer',
          Salesperson: user ? `${user.first_name} ${user.last_name}` : 'Sales Rep',
          Team: team?.name || 'Alpha Squad',
          Subtotal: s.subtotal || s.total,
          Discount: s.discount || 0,
          Tax: s.tax || 0,
          Total: s.total,
          Method: s.payment_method,
          Status: s.payment_status,
        };
      });
    }

    let query = supabase
      .from('sales')
      .select(`
        id,
        invoice_number,
        sale_date,
        total,
        subtotal,
        discount,
        tax,
        payment_method,
        payment_status,
        customer:customers(first_name, last_name, email, company),
        user:profiles(first_name, last_name, email),
        team:teams(name)
      `)
      .eq('organization_id', orgId);

    if (filters.dateFrom) query = query.gte('sale_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('sale_date', filters.dateTo);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.teamId) query = query.eq('team_id', filters.teamId);

    const { data, error } = await query.order('sale_date', { ascending: false });
    if (error) throw error;

    return (data || []).map(row => ({
      Invoice: row.invoice_number,
      Date: row.sale_date ? new Date(row.sale_date).toLocaleDateString() : '',
      Customer: row.customer ? `${(row.customer as unknown as { first_name: string; last_name: string }).first_name} ${(row.customer as unknown as { first_name: string; last_name: string }).last_name}` : '',
      Salesperson: row.user ? `${(row.user as unknown as { first_name: string; last_name: string }).first_name} ${(row.user as unknown as { first_name: string; last_name: string }).last_name}` : '',
      Team: (row.team as unknown as { name: string })?.name || 'N/A',
      Subtotal: row.subtotal,
      Discount: row.discount,
      Tax: row.tax,
      Total: row.total,
      Method: row.payment_method,
      Status: row.payment_status,
    }));
  },

  async getEmployeePerformanceReport(orgId: string) {
    if (isLocalStorageMode()) {
      const profiles = localDb.getAll<Profile>('profiles').filter(p => !orgId || p.organization_id === orgId);
      const sales = localDb.getAll<Sale>('sales').filter(s => s.payment_status === PaymentStatus.PAID);
      const teams = localDb.getAll<Team>('teams');

      return profiles.map(p => {
        const userSales = sales.filter(s => s.user_id === p.id);
        const totalRev = userSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
        const team = teams.find(t => t.id === p.team_id);
        return {
          Employee: `${p.first_name} ${p.last_name}`,
          Email: p.email,
          Role: p.role,
          Team: team?.name || 'Unassigned',
          DealsClosed: userSales.length,
          TotalRevenue: totalRev,
          AverageDealSize: userSales.length > 0 ? Math.round(totalRev / userSales.length) : 0,
        };
      });
    }

    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, team:teams(name)')
      .eq('organization_id', orgId);

    if (pError) throw pError;

    const { data: sales, error: sError } = await supabase
      .from('sales')
      .select('user_id, total, payment_status')
      .eq('organization_id', orgId)
      .eq('payment_status', 'PAID');

    if (sError) throw sError;

    return (profiles || []).map(p => {
      const userSales = (sales || []).filter(s => s.user_id === p.id);
      const totalRev = userSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      return {
        Employee: `${p.first_name} ${p.last_name}`,
        Email: p.email,
        Role: p.role,
        Team: (p.team as unknown as { name: string })?.name || 'Unassigned',
        DealsClosed: userSales.length,
        TotalRevenue: totalRev,
        AverageDealSize: userSales.length > 0 ? Math.round(totalRev / userSales.length) : 0,
      };
    });
  }
};
