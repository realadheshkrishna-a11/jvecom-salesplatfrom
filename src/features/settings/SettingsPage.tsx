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
  CheckCircle2, Sparkles, Key, Globe, DollarSign, Save,
  Truck, Eye, EyeOff, Activity, ExternalLink, Check, Copy,
  AlertCircle, Radio, Clock, Code2
} from 'lucide-react';
import { emailService } from '@/services/email.service';
import {
  jvecomOrdersService,
  DIRECT_EDGE_GATEWAY_URL,
  PRODUCTION_PUBLIC_GATEWAY_URL,
  PROXY_GATEWAY_URL,
} from '@/services/jvecomOrders.service';

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

  // JVecom B2B Orders API State
  const savedJvecomConfig = jvecomOrdersService.getConfig();
  const [jvecomApiKey, setJvecomApiKey] = useState(savedJvecomConfig.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [jvecomGatewayOption, setJvecomGatewayOption] = useState<'proxy' | 'edge' | 'prod' | 'custom'>(
    savedJvecomConfig.gatewayUrl === PROXY_GATEWAY_URL
      ? 'proxy'
      : savedJvecomConfig.gatewayUrl === PRODUCTION_PUBLIC_GATEWAY_URL
      ? 'prod'
      : savedJvecomConfig.gatewayUrl === DIRECT_EDGE_GATEWAY_URL
      ? 'edge'
      : 'proxy'
  );
  const [jvecomCustomUrl, setJvecomCustomUrl] = useState(
    savedJvecomConfig.gatewayUrl !== DIRECT_EDGE_GATEWAY_URL &&
    savedJvecomConfig.gatewayUrl !== PRODUCTION_PUBLIC_GATEWAY_URL &&
    savedJvecomConfig.gatewayUrl !== PROXY_GATEWAY_URL
      ? savedJvecomConfig.gatewayUrl
      : ''
  );
  const [jvecomUseLive, setJvecomUseLive] = useState(savedJvecomConfig.useLiveApi);
  const [jvecomAutoSync, setJvecomAutoSync] = useState(savedJvecomConfig.autoSync);
  const [jvecomSyncInterval, setJvecomSyncInterval] = useState(savedJvecomConfig.autoSyncIntervalMinutes);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    statusCode: number;
    latencyMs: number;
    rateLimit?: any;
    sampleOrder?: any;
    requestId?: string;
  } | null>(null);
  const [copiedPostman, setCopiedPostman] = useState(false);

  const getActiveGatewayUrl = () => {
    if (jvecomGatewayOption === 'proxy') return PROXY_GATEWAY_URL;
    if (jvecomGatewayOption === 'edge') return DIRECT_EDGE_GATEWAY_URL;
    if (jvecomGatewayOption === 'prod') return PRODUCTION_PUBLIC_GATEWAY_URL;
    if (jvecomGatewayOption === 'custom') return jvecomCustomUrl.trim() || PROXY_GATEWAY_URL;
    return PROXY_GATEWAY_URL;
  };

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

  const handleSaveJVecom = () => {
    const gatewayUrl = getActiveGatewayUrl();
    jvecomOrdersService.saveConfig({
      apiKey: jvecomApiKey.trim(),
      gatewayUrl,
      useLiveApi: jvecomUseLive,
      autoSync: jvecomAutoSync,
      autoSyncIntervalMinutes: jvecomSyncInterval,
    });
    success('B2B Gateway Saved', 'JVecom Orders API configuration saved successfully.');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const activeUrl = getActiveGatewayUrl();
      const res = await jvecomOrdersService.testConnection(jvecomApiKey.trim(), activeUrl);
      setTestResult(res);
      if (res.success) {
        success('Gateway Verified', res.message);
      } else {
        toastError(`Verification Failed (${res.statusCode})`, res.message);
      }
    } catch (err) {
      toastError('Network Error', 'Could not reach JVecom gateway endpoint.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResetJVecomCache = () => {
    if (confirm('Clear B2B Orders cache and reset updated_since timestamp? The next sync will re-query all orders live using GET.')) {
      jvecomOrdersService.resetCache();
      success('Cache Cleared', 'B2B orders cache cleared. Incremental polling will fetch all live orders from scratch on next sync.');
    }
  };

  const handleCopyPostman = () => {
    const activeUrl = getActiveGatewayUrl();
    const postmanJson = {
      info: {
        name: 'JVecom B2B Orders API',
        description: 'Production-ready REST Orders API for external CRM, ERP, and logistics integrations.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: jvecomApiKey || 'jvec_live_your_key_here',
            type: 'string',
          },
        ],
      },
      variable: [
        {
          key: 'base_url',
          value: activeUrl,
          type: 'string',
        },
      ],
      item: [
        {
          name: '01 - List & Filter Orders',
          request: {
            method: 'GET',
            url: {
              raw: '{{base_url}}/orders?limit=25&page=1',
              host: ['{{base_url}}'],
              path: ['orders'],
              query: [
                { key: 'limit', value: '25' },
                { key: 'page', value: '1' },
                { key: 'updated_since', value: '2026-10-27T08:00:00Z', disabled: true },
                { key: 'status', value: 'in_transit', disabled: true },
                { key: 'search', value: 'Delhivery', disabled: true },
                { key: 'sort_by', value: 'created_at' },
                { key: 'sort_order', value: 'desc' },
              ],
            },
          },
        },
        {
          name: '02 - Get Order Details',
          request: {
            method: 'GET',
            url: {
              raw: '{{base_url}}/orders/JVE001780002',
              host: ['{{base_url}}'],
              path: ['orders', 'JVE001780002'],
            },
          },
        },
        {
          name: '03 - Get Line Items',
          request: {
            method: 'GET',
            url: {
              raw: '{{base_url}}/orders/JVE001780002/items',
              host: ['{{base_url}}'],
              path: ['orders', 'JVE001780002', 'items'],
            },
          },
        },
        {
          name: '04 - Get Delhivery Tracking',
          request: {
            method: 'GET',
            url: {
              raw: '{{base_url}}/orders/JVE001780002/tracking',
              host: ['{{base_url}}'],
              path: ['orders', 'JVE001780002', 'tracking'],
            },
          },
        },
      ],
    };

    navigator.clipboard.writeText(JSON.stringify(postmanJson, null, 2));
    setCopiedPostman(true);
    setTimeout(() => setCopiedPostman(false), 2000);
    success('Copied Postman Collection', 'Collection JSON copied! In Postman, click Import → Raw text → Paste.');
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
        subtitle="Manage company information, JVecom B2B API gateway, database engine, email delivery, and security policies."
      />

      <Tabs defaultValue="jvecom" className="space-y-4">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="jvecom" className="gap-1.5 text-xs">
            <Truck className="h-3.5 w-3.5 text-primary" /> JVecom B2B API
          </TabsTrigger>
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

        {/* TAB: JVECOM B2B ORDERS API INTEGRATION */}
        <TabsContent value="jvecom">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" /> JVecom B2B Orders API Integration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Connect external B2B order records, recipient addresses, line items, and live Delhivery tracking checkpoints.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPostman}
                  className="text-xs gap-1.5 h-8 shrink-0"
                >
                  {copiedPostman ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Postman Collection JSON
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 text-xs">
              {/* Quick Spec Banner */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      REST v1.0 • Strictly Read-Only
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Delhivery Live Sync
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Rate Limit: 60 req/min
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  To connect, generate your secret API key from JVecom B2B Admin under Developer API (starts with{' '}
                  <code className="text-foreground font-mono bg-muted px-1 py-0.5 rounded">jvec_live_...</code>).
                  The API strictly rejects POST/PUT/DELETE requests with HTTP 405.
                </p>
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Secret API Key (jvec_live_...)</Label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Authentication: Bearer &lt;token&gt;
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={jvecomApiKey}
                    onChange={(e) => setJvecomApiKey(e.target.value)}
                    placeholder="jvec_live_567bb9e4_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
                    className="pr-10 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Hashed with SHA-256 and verified on every gateway request.
                </p>
              </div>

              {/* Gateway Endpoint Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Gateway Target Endpoint</Label>
                  <span className="text-[11px] text-muted-foreground">
                    Web browser environments require the Built-in Proxy to bypass CORS.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div
                    onClick={() => setJvecomGatewayOption('proxy')}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      jvecomGatewayOption === 'proxy'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground text-xs">Built-in App Proxy</span>
                      <Badge className="text-[9px] py-0 px-1 bg-emerald-500/20 text-emerald-500 border-none font-bold">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] font-mono break-all font-semibold text-primary">
                      /api/jvecom
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Vite dev &amp; Vercel server proxy. Solves browser CORS errors automatically.
                    </p>
                  </div>

                  <div
                    onClick={() => setJvecomGatewayOption('edge')}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      jvecomGatewayOption === 'edge'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground text-xs">Direct Edge Gateway</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1">
                        Postman / CLI
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[10px] font-mono break-all line-clamp-1">
                      https://wokqhsfrncvswtnukdou.supabase.co
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Direct HTTPS Edge function. Strict read-only.
                    </p>
                  </div>

                  <div
                    onClick={() => setJvecomGatewayOption('prod')}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      jvecomGatewayOption === 'prod'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground text-xs">Production Domain</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1">
                        Public CDN
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] font-mono break-all">
                      https://www.jvecomb2b.com/api/v1
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Public production custom domain endpoint.
                    </p>
                  </div>

                  <div
                    onClick={() => setJvecomGatewayOption('custom')}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      jvecomGatewayOption === 'custom'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground text-xs">Custom Proxy</span>
                    </div>
                    <p className="text-muted-foreground text-[10px]">
                      Specify an enterprise reverse proxy or staging URL.
                    </p>
                  </div>
                </div>

                {jvecomGatewayOption === 'custom' && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-[11px]">Custom Gateway Base URL</Label>
                    <Input
                      value={jvecomCustomUrl}
                      onChange={(e) => setJvecomCustomUrl(e.target.value)}
                      placeholder="https://your-custom-gateway.com/api/v1"
                      className="text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Mode Toggle & Polling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <span className="font-semibold text-foreground block">Real-Time GET Gateway</span>
                    <span className="text-muted-foreground text-[11px]">
                      Queries live HTTPS Edge Gateway strictly using read-only GET requests
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs py-1 px-2.5">
                    Live Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <span className="font-semibold text-foreground block">Incremental Real-Time Polling</span>
                    <span className="text-muted-foreground text-[11px]">
                      Uses updated_since without duplicate fetches
                    </span>
                  </div>
                  <Button
                    variant={jvecomAutoSync ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setJvecomAutoSync(!jvecomAutoSync)}
                    className="text-xs"
                  >
                    {jvecomAutoSync ? 'Auto Polling' : 'Manual Sync'}
                  </Button>
                </div>
              </div>

              {/* Test Connection Result Box */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                      : 'border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <span className="font-bold text-xs">
                        {testResult.success ? 'Gateway Connection Successful (200 OK)' : `Connection Diagnostic (${testResult.statusCode || 'CORS / Network'})`}
                      </span>
                    </div>
                    <span className="font-mono text-[11px]">
                      Latency: {testResult.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-xs mt-1.5 leading-relaxed opacity-90">{testResult.message}</p>
                  
                  {!testResult.success && jvecomGatewayOption !== 'proxy' && (
                    <div className="mt-3 pt-2 border-t border-rose-500/20">
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        Direct browser calls to external gateways are blocked by browser CORS security. Switch to the built-in proxy to resolve this:
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => {
                          setJvecomGatewayOption('proxy');
                          setTimeout(() => {
                            handleTestConnection();
                          }, 100);
                        }}
                      >
                        <RotateCcw className="h-3 w-3" /> Select Built-in Proxy (/api/jvecom) &amp; Retest
                      </Button>
                    </div>
                  )}

                  {testResult.rateLimit && (
                    <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-mono flex items-center justify-between">
                      <span>Rate Limit: {testResult.rateLimit.remaining}/{testResult.rateLimit.limit} remaining</span>
                      {testResult.requestId && <span>Trace ID: {testResult.requestId}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Cache Management */}
              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-foreground block">Cache &amp; Sync State</span>
                  <span className="text-muted-foreground text-[11px]">
                    Last synced timestamp:{' '}
                    {savedJvecomConfig.lastSyncedAt
                      ? new Date(savedJvecomConfig.lastSyncedAt).toLocaleString()
                      : 'Never (will fetch full history)'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetJVecomCache}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Orders Cache
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="text-xs gap-1.5"
              >
                <Activity className={`h-3.5 w-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                {testingConnection ? 'Testing Gateway...' : 'Test Connection'}
              </Button>

              <Button size="sm" onClick={handleSaveJVecom} className="text-xs gap-1.5 bg-primary">
                <Save className="h-3.5 w-3.5" /> Save Gateway Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

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
