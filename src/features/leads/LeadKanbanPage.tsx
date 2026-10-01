import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { leadsService } from '@/services/leads.service';
import { customersService } from '@/services/customers.service';
import { productsService } from '@/services/products.service';
import type { Lead, Customer, Product, LeadActivity, FollowUp } from '@/types';
import { LeadStage, LeadActivityType, FollowUpStatus, CustomerStatus } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  User,
  Building,
  CheckCircle2,
  Trash2,
  TrendingUp,
  MessageSquare,
  Clock,
  ExternalLink,
  Target,
  Sparkles,
  ShoppingBag,
  Filter,
  Check,
  Award,
} from 'lucide-react';

const STAGES = [
  { id: LeadStage.NEW, label: 'New Inquiries', color: 'border-t-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { id: LeadStage.CONTACTED, label: 'Contacted', color: 'border-t-indigo-500', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { id: LeadStage.QUALIFIED, label: 'Qualified', color: 'border-t-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: LeadStage.DEMO, label: 'Demo / Pitch', color: 'border-t-purple-500', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { id: LeadStage.NEGOTIATION, label: 'Negotiation', color: 'border-t-pink-500', badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  { id: LeadStage.WON, label: 'Won / Closed', color: 'border-t-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { id: LeadStage.LOST, label: 'Lost', color: 'border-t-rose-500', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
];

export function LeadKanbanPage() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Search and filters
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [selectedStageTab, setSelectedStageTab] = useState('ALL');

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('new');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // New Lead Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formExpectedValue, setFormExpectedValue] = useState<number>(0);
  const [formProbability, setFormProbability] = useState<number>(30);
  const [formStage, setFormStage] = useState<LeadStage>(LeadStage.NEW);
  const [formSource, setFormSource] = useState('Website');
  const [formCloseDate, setFormCloseDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Lead Detail Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Activity Log form inside detail modal
  const [actType, setActType] = useState<LeadActivityType>(LeadActivityType.CALL);
  const [actDescription, setActDescription] = useState('');
  const [actOutcome, setActOutcome] = useState('Completed');
  const [actSubmitting, setActSubmitting] = useState(false);

  // Follow-up form inside detail modal
  const [fuDate, setFuDate] = useState('');
  const [fuTime, setFuTime] = useState('11:00');
  const [fuNotes, setFuNotes] = useState('');
  const [fuSubmitting, setFuSubmitting] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, custRes, prodRes] = await Promise.allSettled([
        leadsService.getAllForBoard(orgId),
        customersService.list(orgId, { pageSize: 100 }),
        productsService.list(orgId, { pageSize: 100 }),
      ]);

      if (leadsRes.status === 'fulfilled') {
        setLeads(leadsRes.value);
      }
      if (custRes.status === 'fulfilled') {
        setCustomers(custRes.value.data);
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data);
      }
    } catch (err) {
      console.error('Error loading CRM pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  // Load detail drawer data when a lead is selected
  const openLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
    try {
      setActivityLoading(true);
      const [acts, fus] = await Promise.allSettled([
        leadsService.getActivities(lead.id),
        leadsService.getFollowUps(orgId, { leadId: lead.id }),
      ]);
      if (acts.status === 'fulfilled') setActivities(acts.value);
      if (fus.status === 'fulfilled') setFollowUps(fus.value);
    } catch (err) {
      console.error('Error loading lead activities:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Quick stage move
  const handleStageMove = async (leadId: string, nextStage: LeadStage) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, stage: nextStage } : null));
    }

    try {
      await leadsService.updateStage(leadId, nextStage, profile?.id || 'admin-user');
      success('Stage Updated', `Moved to ${nextStage}`);
      // Refresh background data
      const updated = await leadsService.getAllForBoard(orgId);
      setLeads(updated);
    } catch {
      toastError('Update Failed', 'Could not sync stage change to server');
    }
  };

  // Handle lead creation
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    let targetCustomerId = formCustomerId;

    if (contactMode === 'new') {
      if (!formFirstName.trim()) errors.firstName = 'First name is required';
      if (!formPhone.trim() && !formEmail.trim()) {
        errors.contact = 'Provide at least a Phone or Email for the contact';
      }
    } else {
      if (!targetCustomerId) errors.customerId = 'Please choose a customer from the list';
    }

    if (formExpectedValue < 0) {
      errors.expectedValue = 'Deal value must be positive';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      setCreateSubmitting(true);

      // If creating new contact inline, register customer first
      if (contactMode === 'new') {
        const createdCust = await customersService.create(orgId, {
          first_name: formFirstName.trim(),
          last_name: formLastName.trim() || '',
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          company: formCompany.trim() || undefined,
          status: CustomerStatus.PROSPECT,
          lead_source: formSource,
          assigned_to: profile?.id,
        });
        targetCustomerId = createdCust.id;
        // update local customers list
        setCustomers((prev) => [createdCust, ...prev]);
      }

      // Title determination
      const prod = products.find((p) => p.id === formProductId);
      const title =
        formTitle.trim() ||
        (prod
          ? `${prod.name} Enrollment`
          : `Opportunity: ${formFirstName || 'Prospect'} (${formatCurrency(formExpectedValue)})`);

      const newLead = await leadsService.create(orgId, {
        customer_id: targetCustomerId,
        assigned_to: profile?.id,
        product_id: formProductId || undefined,
        title,
        expected_value: Number(formExpectedValue) || 0,
        probability: Number(formProbability) || 20,
        stage: formStage,
        lead_source: formSource,
        expected_close_date: formCloseDate || undefined,
        notes: formNotes || undefined,
      });

      success('Opportunity Created', `Added ${newLead.title || 'deal'} to ${formStage} column.`);
      setIsCreateOpen(false);

      // Reset form
      setFormFirstName('');
      setFormLastName('');
      setFormEmail('');
      setFormPhone('');
      setFormCompany('');
      setFormTitle('');
      setFormCustomerId('');
      setFormProductId('');
      setFormExpectedValue(0);
      setFormProbability(30);
      setFormStage(LeadStage.NEW);
      setFormNotes('');

      // Reload leads board
      const refreshed = await leadsService.getAllForBoard(orgId);
      setLeads(refreshed);
    } catch (err: unknown) {
      toastError(
        'Failed to Create Opportunity',
        err instanceof Error ? err.message : 'Please check input fields and retry'
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Log activity inside lead detail
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !actDescription.trim()) return;

    try {
      setActSubmitting(true);
      const newAct = await leadsService.addActivity(
        orgId,
        selectedLead.id,
        profile?.id || 'admin-user',
        {
          type: actType,
          description: actDescription.trim(),
          outcome: actOutcome,
          activity_date: new Date().toISOString(),
        }
      );
      setActivities((prev) => [newAct, ...prev]);
      setActDescription('');
      success('Activity Logged', `${actType} record logged successfully`);
    } catch {
      toastError('Failed', 'Could not record activity');
    } finally {
      setActSubmitting(false);
    }
  };

  // Schedule follow-up inside lead detail
  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !fuDate) {
      toastError('Date Required', 'Please pick a follow-up due date');
      return;
    }

    try {
      setFuSubmitting(true);
      const newFu = await leadsService.createFollowUp(
        orgId,
        profile?.id || 'admin-user',
        {
          lead_id: selectedLead.id,
          due_date: fuDate,
          due_time: fuTime || undefined,
          notes: fuNotes || undefined,
          reminder: true,
        }
      );
      setFollowUps((prev) => [...prev, newFu]);
      setFuDate('');
      setFuNotes('');
      success('Follow-up Scheduled', `Reminder set for ${fuDate}`);
    } catch {
      toastError('Failed', 'Could not schedule follow-up');
    } finally {
      setFuSubmitting(false);
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this deal opportunity?')) return;
    try {
      await leadsService.delete(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setDetailOpen(false);
      setSelectedLead(null);
      success('Deal Deleted', 'Opportunity removed from pipeline');
    } catch {
      toastError('Failed', 'Could not delete deal');
    }
  };

  // Convert to sale
  const handleConvertToSale = (lead: Lead) => {
    setDetailOpen(false);
    navigate(
      `/sales/create?lead_id=${lead.id}&customer_id=${lead.customer_id}${
        lead.product_id ? `&product_id=${lead.product_id}` : ''
      }`
    );
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        search === '' ||
        (l.title && l.title.toLowerCase().includes(search.toLowerCase())) ||
        (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())) ||
        (l.customer &&
          `${l.customer.first_name} ${l.customer.last_name} ${l.customer.company || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())) ||
        (l.product && l.product.name.toLowerCase().includes(search.toLowerCase()));

      const matchSource =
        sourceFilter === 'ALL' ||
        l.source === sourceFilter ||
        l.lead_source === sourceFilter;

      const matchStageTab =
        selectedStageTab === 'ALL' || l.stage === selectedStageTab;

      return matchSearch && matchSource && matchStageTab;
    });
  }, [leads, search, sourceFilter, selectedStageTab]);

  // Metric aggregates
  const totalPipelineValue = useMemo(
    () => leads.reduce((sum, l) => sum + Number(l.expected_value || 0), 0),
    [leads]
  );
  const weightedPipeline = useMemo(
    () =>
      leads.reduce(
        (sum, l) =>
          sum + (Number(l.expected_value || 0) * Number(l.probability || 0)) / 100,
        0
      ),
    [leads]
  );
  const wonLeadsCount = useMemo(
    () => leads.filter((l) => l.stage === LeadStage.WON).length,
    [leads]
  );
  const activeLeadsCount = useMemo(
    () => leads.filter((l) => l.stage !== LeadStage.WON && l.stage !== LeadStage.LOST).length,
    [leads]
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="CRM Sales Pipeline"
        subtitle="Manage deal opportunities, track customer stages, log calls, and convert wins into revenue."
      >
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm font-semibold">
          <Plus className="w-4 h-4" /> Add Opportunity / Lead
        </Button>
      </PageHeader>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Pipeline</p>
            <p className="text-xl font-bold text-foreground mt-1">
              {formatCurrency(totalPipelineValue)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{leads.length} total opportunities</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-card border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Weighted Forecast</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCurrency(weightedPipeline)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Probability-adjusted</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-card border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Deals</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {activeLeadsCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">In negotiation & pitch</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-card border-border/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Won Contracts</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {wonLeadsCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ready for invoice / closed</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 bg-card border-border/60 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by prospect, company, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" /> Source:
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Direct Call">Direct Call</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                <SelectItem value="Google Search">Google Search</SelectItem>
              </SelectContent>
            </Select>

            {search || sourceFilter !== 'ALL' ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearch('');
                  setSourceFilter('ALL');
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Kanban Board Container */}
      {loading ? (
        <LoadingSpinner text="Constructing CRM sales pipeline..." />
      ) : (
        <div className="w-full overflow-x-auto pb-6">
          <div className="flex gap-3.5" style={{ minWidth: 'max-content' }}>
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
            const totalStageValue = stageLeads.reduce(
              (sum, l) => sum + Number(l.expected_value || 0),
              0
            );

            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-xl bg-muted/30 border border-border/60 p-2.5 max-h-[calc(100vh-280px)]"
                style={{ width: '280px', minWidth: '280px' }}
              >
                {/* Stage Column Header */}
                <div className={`border-t-4 ${stage.color} pt-2 pb-2.5 px-1 mb-2`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {stage.label}
                    </h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4.5 font-bold ${stage.badge}`}>
                      {stageLeads.length}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    {formatCurrency(totalStageValue)}
                  </p>
                </div>

                {/* Lead Cards List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-lg">
                      No deals
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const cust = lead.customer;
                      const customerName = cust
                        ? `${cust.first_name} ${cust.last_name}`
                        : 'Prospect';

                      return (
                        <Card
                          key={lead.id}
                          onClick={() => openLeadDetail(lead)}
                          className="p-3 border-border/70 shadow-xs hover:shadow-md hover:border-primary/60 transition-all cursor-pointer bg-card group"
                        >
                          <div className="space-y-2">
                            {/* Card Top: Customer & Deal Value */}
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                  {customerName}
                                </span>
                                {cust?.company && (
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 line-clamp-1">
                                    <Building className="w-2.5 h-2.5 shrink-0" /> {cust.company}
                                  </p>
                                )}
                              </div>
                              <span className="font-extrabold text-xs text-primary shrink-0">
                                {formatCurrency(lead.expected_value)}
                              </span>
                            </div>

                            {/* Title & Product */}
                            <p className="text-[11px] font-medium text-foreground/90 line-clamp-1">
                              {lead.title || (lead.product?.name ? `${lead.product.name} Lead` : 'Deal')}
                            </p>

                            {/* Product & Source Tags */}
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              {lead.product && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted/80 text-foreground/80">
                                  {lead.product.name}
                                </Badge>
                              )}
                              {(lead.source || lead.lead_source) && (
                                <span className="text-[9px] text-muted-foreground bg-muted/40 px-1 rounded">
                                  {lead.source || lead.lead_source}
                                </span>
                              )}
                            </div>

                            {/* Notes preview */}
                            {lead.notes && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 bg-muted/40 p-1.5 rounded text-wrap break-words">
                                {lead.notes}
                              </p>
                            )}

                            {/* Footer: Probability & Quick Action Buttons */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {lead.probability}% Prob.
                              </span>

                              <div className="flex items-center gap-1">
                                {cust?.phone && (
                                  <a
                                    href={`tel:${cust.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                    title={`Call ${cust.phone}`}
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}

                                {cust?.phone && (
                                  <a
                                    href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors"
                                    title="WhatsApp Chat"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                )}

                                {stage.id !== LeadStage.WON && stage.id !== LeadStage.LOST && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px] text-primary hover:text-primary font-medium whitespace-nowrap shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const curIdx = STAGES.findIndex((s) => s.id === stage.id);
                                      if (curIdx < STAGES.length - 2) {
                                        handleStageMove(lead.id, STAGES[curIdx + 1].id as LeadStage);
                                      }
                                    }}
                                  >
                                    Advance <ArrowRight className="w-2.5 h-2.5 ml-0.5 inline" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CREATE OPPORTUNITY MODAL                                               */}
      {/* ========================================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Create Opportunity / Lead
            </DialogTitle>
            <DialogDescription>
              Register a deal with an existing customer or enter a brand new prospect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-4 pt-1">
            {/* Contact Mode Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={contactMode === 'new' ? 'default' : 'outline'}
                  onClick={() => setContactMode('new')}
                  className="text-xs"
                >
                  <User className="w-3.5 h-3.5 mr-1.5" /> New Prospect Contact
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={contactMode === 'existing' ? 'default' : 'outline'}
                  onClick={() => setContactMode('existing')}
                  className="text-xs"
                >
                  <Building className="w-3.5 h-3.5 mr-1.5" /> Existing Customer
                </Button>
              </div>
            </div>

            {/* Mode 1: New Prospect Fields */}
            {contactMode === 'new' && (
              <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">First Name *</Label>
                    <Input
                      placeholder="e.g. Ramesh"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    {formErrors.firstName && (
                      <p className="text-[10px] text-destructive">{formErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Last Name</Label>
                    <Input
                      placeholder="e.g. Kumar"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Phone / Mobile</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="prospect@company.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Company / Organization</Label>
                  <Input
                    placeholder="e.g. Wipro or Self-employed"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                {formErrors.contact && (
                  <p className="text-[10px] text-destructive font-medium">{formErrors.contact}</p>
                )}
              </div>
            )}

            {/* Mode 2: Existing Customer Select */}
            {contactMode === 'existing' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Customer *</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose customer from directory" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} {c.company ? `(${c.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.customerId && (
                  <p className="text-[10px] text-destructive">{formErrors.customerId}</p>
                )}
              </div>
            )}

            {/* Deal Details Section */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Product / Program</Label>
                <Select
                  value={formProductId}
                  onValueChange={(val) => {
                    setFormProductId(val);
                    const prod = products.find((p) => p.id === val);
                    if (prod) {
                      setFormExpectedValue(prod.selling_price);
                      if (!formTitle) setFormTitle(`${prod.name} Enrollment`);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.selling_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pipeline Stage</Label>
                <Select value={formStage} onValueChange={(val) => setFormStage(val as LeadStage)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expected Value (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formExpectedValue}
                  onChange={(e) => setFormExpectedValue(Number(e.target.value) || 0)}
                  className="h-9 text-xs"
                />
                {formErrors.expectedValue && (
                  <p className="text-[10px] text-destructive">{formErrors.expectedValue}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Win Probability</Label>
                  <span className="text-xs font-bold text-primary">{formProbability}%</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {[20, 40, 60, 80, 100].map((pct) => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => setFormProbability(pct)}
                      className={`text-[10px] flex-1 py-1 rounded border transition-colors ${
                        formProbability === pct
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-muted/50 border-border/80 hover:bg-muted'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lead Source</Label>
                <Select value={formSource} onValueChange={setFormSource}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website Form</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp Inbound</SelectItem>
                    <SelectItem value="Direct Call">Direct Call</SelectItem>
                    <SelectItem value="Referral">Peer Referral</SelectItem>
                    <SelectItem value="Meta Ads">Meta Campaign</SelectItem>
                    <SelectItem value="Google Search">Google Organic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Close Date</Label>
                <Input
                  type="date"
                  value={formCloseDate}
                  onChange={(e) => setFormCloseDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Prospect Background</Label>
              <Textarea
                placeholder="Key expectations, budget constraints, preferred schedule..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting} className="gap-2">
                {createSubmitting ? (
                  <>
                    <LoadingSpinner text="" /> Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Opportunity
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. LEAD DETAIL DRAWER & INTERACTIVE MANAGEMENT MODAL                      */}
      {/* ========================================================================= */}
      {selectedLead && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span className="text-primary font-extrabold">
                    {formatCurrency(selectedLead.expected_value)}
                  </span>
                  <span>•</span>
                  <span>{selectedLead.title || 'Opportunity Dossier'}</span>
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Manage stage progression, contact outreach, activity timelines, and follow-ups.
              </DialogDescription>
            </DialogHeader>

            {/* Stage Selector Bar */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Stage Status:</span>
                <Badge variant="outline" className="font-bold">
                  {selectedLead.stage}
                </Badge>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-1">
                {STAGES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleStageMove(selectedLead.id, s.id as LeadStage)}
                    className={`text-[10px] py-1.5 px-1 rounded font-semibold text-center border transition-all ${
                      selectedLead.stage === s.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {s.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Dossier Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border/60 bg-card">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Prospect Details
                </p>
                <p className="font-bold text-sm text-foreground mt-1">
                  {selectedLead.customer
                    ? `${selectedLead.customer.first_name} ${selectedLead.customer.last_name}`
                    : 'Prospective Client'}
                </p>
                {selectedLead.customer?.company && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building className="w-3 h-3" /> {selectedLead.customer.company}
                  </p>
                )}
                {selectedLead.customer?.phone && (
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`tel:${selectedLead.customer.phone}`}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {selectedLead.customer.phone}
                    </a>
                    <a
                      href={`https://wa.me/${selectedLead.customer.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  </div>
                )}
                {selectedLead.customer?.email && (
                  <a
                    href={`mailto:${selectedLead.customer.email}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                  >
                    <Mail className="w-3 h-3" /> {selectedLead.customer.email}
                  </a>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Opportunity Metrics
                </p>
                <div className="space-y-1 mt-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product:</span>
                    <span className="font-medium text-foreground">{selectedLead.product?.name || 'Custom Solution'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deal Value:</span>
                    <span className="font-bold text-primary">{formatCurrency(selectedLead.expected_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Probability:</span>
                    <span className="font-semibold text-emerald-600">{selectedLead.probability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lead Source:</span>
                    <span>{selectedLead.source || selectedLead.lead_source || 'Website'}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedLead.notes && (
              <div className="p-3 bg-muted/30 border border-border/60 rounded-xl text-xs space-y-1">
                <span className="font-bold text-muted-foreground text-[10px] uppercase">Notes:</span>
                <p className="text-foreground/90">{selectedLead.notes}</p>
              </div>
            )}

            {/* Interactive Tabs: Activities & Follow-ups */}
            <Tabs defaultValue="activities" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="activities" className="text-xs">
                  Activity Timeline ({activities.length})
                </TabsTrigger>
                <TabsTrigger value="followups" className="text-xs">
                  Follow-ups & Tasks ({followUps.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Activities */}
              <TabsContent value="activities" className="space-y-3 pt-2">
                {/* Quick Log Form */}
                <form onSubmit={handleAddActivity} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                  <p className="text-xs font-bold text-foreground">Log New Interaction</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={actType} onValueChange={(val) => setActType(val as LeadActivityType)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LeadActivityType.CALL}>Phone Call</SelectItem>
                        <SelectItem value={LeadActivityType.WHATSAPP}>WhatsApp</SelectItem>
                        <SelectItem value={LeadActivityType.EMAIL}>Email</SelectItem>
                        <SelectItem value={LeadActivityType.DEMO}>Demo / Meeting</SelectItem>
                        <SelectItem value={LeadActivityType.NOTE}>Internal Note</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Outcome (e.g. Interested)"
                      value={actOutcome}
                      onChange={(e) => setActOutcome(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button type="submit" size="sm" disabled={actSubmitting} className="h-8 text-xs font-semibold">
                      {actSubmitting ? 'Logging...' : 'Record'}
                    </Button>
                  </div>
                  <Input
                    placeholder="Details: Discussed curriculum, payment plans, next steps..."
                    value={actDescription}
                    onChange={(e) => setActDescription(e.target.value)}
                    className="h-8 text-xs"
                  />
                </form>

                {/* Activities List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activityLoading ? (
                    <LoadingSpinner text="Fetching timeline..." />
                  ) : activities.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">No activities logged yet.</p>
                  ) : (
                    activities.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-semibold">
                              {act.type}
                            </Badge>
                            {act.outcome && <span className="text-[11px] text-muted-foreground">• {act.outcome}</span>}
                          </span>
                          <span className="text-[10px]">
                            {new Date(act.activity_date || act.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {act.description && <p className="text-foreground/90 text-xs">{act.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Follow-ups */}
              <TabsContent value="followups" className="space-y-3 pt-2">
                {/* Schedule follow-up form */}
                <form onSubmit={handleCreateFollowUp} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                  <p className="text-xs font-bold text-foreground">Schedule Next Follow-Up</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={fuDate}
                      onChange={(e) => setFuDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="time"
                      value={fuTime}
                      onChange={(e) => setFuTime(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Notes: Call regarding installment approval..."
                      value={fuNotes}
                      onChange={(e) => setFuNotes(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button type="submit" size="sm" disabled={fuSubmitting} className="h-8 text-xs">
                      {fuSubmitting ? 'Saving...' : 'Set Reminder'}
                    </Button>
                  </div>
                </form>

                {/* Follow-ups List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {followUps.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">No follow-ups scheduled.</p>
                  ) : (
                    followUps.map((fu) => (
                      <div key={fu.id} className="p-2.5 rounded-lg border border-border/60 bg-card text-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>{fu.due_date} {fu.due_time ? `at ${fu.due_time}` : ''}</span>
                          </div>
                          {fu.notes && <p className="text-muted-foreground text-[11px] mt-0.5">{fu.notes}</p>}
                        </div>
                        <Badge variant={fu.status === FollowUpStatus.COMPLETED ? 'default' : 'outline'} className="text-[10px]">
                          {fu.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Modal Actions Footer */}
            <DialogFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs w-full sm:w-auto"
                onClick={() => handleDeleteLead(selectedLead.id)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Deal
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => handleConvertToSale(selectedLead)}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Convert to Won Sale
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default LeadKanbanPage;
