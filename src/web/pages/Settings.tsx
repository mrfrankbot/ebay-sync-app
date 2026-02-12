import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Banner,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Layout,
  Page,
  Spinner,
  TextField,
  Toast,
  Text,
  Select,
  Modal,
  Box,
  InlineStack,
  BlockStack,
  Divider,
} from '@shopify/polaris';
import {
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Link,
  Unlink,
  TestTube,
  Zap,
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import StatusIndicator from '../components/StatusIndicator';
import MetricCard from '../components/MetricCard';

interface SettingsResponse {
  sync_price: string;
  sync_inventory: string;
  auto_list: string;
  sync_interval_minutes: string;
  item_location: string;
  price_multiplier: string;
  inventory_buffer: string;
  auto_end_oos: string;
  sync_mode: string;
  [key: string]: string;
}

interface AuthStatus {
  shopify: {
    connected: boolean;
    store: string;
    lastSync?: string;
    error?: string;
  };
  ebay: {
    connected: boolean;
    user: string;
    tokenExpires?: string;
    lastSync?: string;
    error?: string;
  };
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

// API helper functions
const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`/api${endpoint}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
};

interface SettingsState {
  syncPrice: boolean;
  syncInventory: boolean;
  autoList: boolean;
  autoEndOOS: boolean;
  syncIntervalMinutes: string;
  itemLocation: string;
  priceMultiplier: string;
  inventoryBuffer: string;
  syncMode: string;
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const Settings: React.FC = () => {
  // State
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [showTestModal, setShowTestModal] = useState(false);
  const [activeTest, setActiveTest] = useState<string>('');

  const queryClient = useQueryClient();
  const { addNotification, setConnectionStatus } = useAppStore();

  // Queries
  const { data: authStatus, isLoading: authLoading, refetch: refetchAuth } = useQuery({
    queryKey: ['auth-status'],
    queryFn: async (): Promise<AuthStatus> => {
      const [shopifyStatus, ebayStatus] = await Promise.all([
        api.get('/status'),
        api.get('/ebay/auth/status'),
      ]);
      return {
        shopify: shopifyStatus as any,
        ebay: ebayStatus as any,
      };
    },
    refetchInterval: 30000,
  });

  // Update connection status in store
  useEffect(() => {
    if (authStatus) {
      setConnectionStatus('shopify', authStatus.shopify.connected);
      setConnectionStatus('ebay', authStatus.ebay.connected);
    }
  }, [authStatus, setConnectionStatus]);

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: (settingsData: SettingsState) => {
      const payload = {
        sync_price: String(settingsData.syncPrice),
        sync_inventory: String(settingsData.syncInventory),
        auto_list: String(settingsData.autoList),
        auto_end_oos: String(settingsData.autoEndOOS),
        sync_interval_minutes: settingsData.syncIntervalMinutes,
        item_location: settingsData.itemLocation,
        price_multiplier: settingsData.priceMultiplier,
        inventory_buffer: settingsData.inventoryBuffer,
        sync_mode: settingsData.syncMode,
      };
      return api.put('/settings', payload);
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Settings saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      addNotification({ type: 'error', title: 'Failed to save settings', message: error.message });
    },
  });

  const disconnectEbayMutation = useMutation({
    mutationFn: () => api.delete('/ebay/auth'),
    onSuccess: () => {
      addNotification({ type: 'success', title: 'eBay account disconnected' });
      refetchAuth();
    },
    onError: (error) => {
      addNotification({ type: 'error', title: 'Failed to disconnect eBay', message: error.message });
    },
  });

  // Test functions
  const runTest = async (testType: string) => {
    setActiveTest(testType);
    try {
      let result: TestResult;
      switch (testType) {
        case 'create-product':
          result = await api.post('/test/product/create');
          break;
        case 'update-price':
          result = await api.post('/test/product/update-price');
          break;
        case 'update-inventory':
          result = await api.post('/test/product/update-inventory');
          break;
        default:
          throw new Error('Unknown test type');
      }
      
      setTestResults(prev => ({ ...prev, [testType]: result }));
      addNotification({ 
        type: result.success ? 'success' : 'error', 
        title: `${testType} test ${result.success ? 'passed' : 'failed'}`,
        message: result.message 
      });
    } catch (error) {
      const result: TestResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      };
      setTestResults(prev => ({ ...prev, [testType]: result }));
      addNotification({ type: 'error', title: 'Test failed', message: result.message });
    } finally {
      setActiveTest('');
    }
  };

  // Load settings
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to load settings');
      
      const data = (await response.json()) as SettingsResponse;
      setSettings({
        syncPrice: data.sync_price === 'true',
        syncInventory: data.sync_inventory === 'true',
        autoList: data.auto_list === 'true',
        autoEndOOS: data.auto_end_oos === 'true',
        syncIntervalMinutes: data.sync_interval_minutes ?? '5',
        itemLocation: data.item_location ?? '',
        priceMultiplier: data.price_multiplier ?? '1.0',
        inventoryBuffer: data.inventory_buffer ?? '0',
        syncMode: data.sync_mode ?? 'auto',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = () => {
    if (settings) {
      saveSettingsMutation.mutate(settings);
    }
  };

  const handleEbayConnect = () => {
    window.open('/api/ebay/auth', '_blank', 'width=600,height=700');
  };

  const syncModeOptions = [
    { label: 'Automatic', value: 'auto' },
    { label: 'Manual only', value: 'manual' },
    { label: 'Scheduled', value: 'scheduled' },
  ];

  return (
    <Page 
      title="Settings"
      primaryAction={{
        content: 'Save Settings',
        onAction: handleSave,
        loading: saveSettingsMutation.isPending,
        disabled: !settings,
      }}
      secondaryActions={[
        {
          content: 'Reset to Defaults',
          onAction: () => {
            if (confirm('Reset all settings to default values?')) {
              setSettings({
                syncPrice: true,
                syncInventory: true,
                autoList: false,
                autoEndOOS: false,
                syncIntervalMinutes: '5',
                itemLocation: '',
                priceMultiplier: '1.0',
                inventoryBuffer: '0',
                syncMode: 'auto',
              });
            }
          },
        },
      ]}
    >
      {error && (
        <Banner tone="critical" title="Settings load failed">
          <p>{error}</p>
        </Banner>
      )}

      <Layout>
        {/* Authentication Status */}
        <Layout.Section>
          <Text variant="headingLg" as="h2">Platform Connections</Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {/* Shopify Card */}
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-shopify-500 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-sm"></div>
                    </div>
                    <div>
                      <Text variant="headingMd" as="h3">Shopify</Text>
                      <Text variant="bodySm" tone="subdued" as="p">E-commerce platform</Text>
                    </div>
                  </div>
                  <StatusIndicator
                    type="connection"
                    status={authStatus?.shopify?.connected ? 'connected' : 'disconnected'}
                    platform="shopify"
                    size="md"
                  />
                </div>

                {authLoading ? (
                  <Spinner size="small" />
                ) : authStatus?.shopify ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Text variant="bodySm" as="span">Status:</Text>
                      <Badge tone={authStatus.shopify.connected ? 'success' : 'critical'}>
                        {authStatus.shopify.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                    {authStatus.shopify.store && (
                      <div className="flex justify-between">
                        <Text variant="bodySm" as="span">Store:</Text>
                        <Text variant="bodySm" as="span">{authStatus.shopify.store}</Text>
                      </div>
                    )}
                    {authStatus.shopify.lastSync && (
                      <div className="flex justify-between">
                        <Text variant="bodySm" as="span">Last Sync:</Text>
                        <Text variant="bodySm" tone="subdued" as="span">
                          {formatTimestamp(authStatus.shopify.lastSync)}
                        </Text>
                      </div>
                    )}
                    {authStatus.shopify.error && (
                      <Banner tone="critical">
                        <p>{authStatus.shopify.error}</p>
                      </Banner>
                    )}
                  </div>
                ) : null}
              </div>
            </Card>

            {/* eBay Card */}
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ebay-500 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-sm"></div>
                    </div>
                    <div>
                      <Text variant="headingMd" as="h3">eBay</Text>
                      <Text variant="bodySm" tone="subdued" as="p">Marketplace platform</Text>
                    </div>
                  </div>
                  <StatusIndicator
                    type="connection"
                    status={authStatus?.ebay?.connected ? 'connected' : 'disconnected'}
                    platform="ebay"
                    size="md"
                  />
                </div>

                {authLoading ? (
                  <Spinner size="small" />
                ) : authStatus?.ebay ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Text variant="bodySm" as="span">Status:</Text>
                      <Badge tone={authStatus.ebay.connected ? 'success' : 'critical'}>
                        {authStatus.ebay.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                    {authStatus.ebay.user && (
                      <div className="flex justify-between">
                        <Text variant="bodySm" as="span">User:</Text>
                        <Text variant="bodySm" as="span">{authStatus.ebay.user}</Text>
                      </div>
                    )}
                    {authStatus.ebay.tokenExpires && (
                      <div className="flex justify-between">
                        <Text variant="bodySm" as="span">Token Expires:</Text>
                        <Text variant="bodySm" tone="subdued" as="span">
                          {formatTimestamp(authStatus.ebay.tokenExpires)}
                        </Text>
                      </div>
                    )}
                    {authStatus.ebay.lastSync && (
                      <div className="flex justify-between">
                        <Text variant="bodySm" as="span">Last Sync:</Text>
                        <Text variant="bodySm" tone="subdued" as="span">
                          {formatTimestamp(authStatus.ebay.lastSync)}
                        </Text>
                      </div>
                    )}
                    {authStatus.ebay.error && (
                      <Banner tone="critical">
                        <p>{authStatus.ebay.error}</p>
                      </Banner>
                    )}

                    <div className="mt-4 flex gap-2">
                      {authStatus.ebay.connected ? (
                        <Button
                          size="slim"
                          icon={<Unlink className="w-4 h-4" />}
                          onClick={() => disconnectEbayMutation.mutate()}
                          loading={disconnectEbayMutation.isPending}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="slim"
                          icon={<Link className="w-4 h-4" />}
                          onClick={handleEbayConnect}
                        >
                          Connect eBay
                        </Button>
                      )}
                      <Button
                        size="slim"
                        icon={<RefreshCw className="w-4 h-4" />}
                        onClick={() => refetchAuth()}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* Sync Configuration */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <Text variant="headingLg" as="h2">Sync Configuration</Text>
              
              {loading || !settings ? (
                <div className="py-8">
                  <Spinner accessibilityLabel="Loading settings" size="large" />
                </div>
              ) : (
                <div style={{ marginTop: '1.5rem' }}>
                  <BlockStack gap="400">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      <Checkbox
                        label="Sync product prices"
                        helpText="Automatically sync price changes from Shopify to eBay"
                        checked={settings.syncPrice}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, syncPrice: value } : null)
                        }
                      />
                      
                      <Checkbox
                        label="Sync inventory levels"
                        helpText="Keep eBay inventory in sync with Shopify stock levels"
                        checked={settings.syncInventory}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, syncInventory: value } : null)
                        }
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      <Checkbox
                        label="Auto-list new products"
                        helpText="Automatically create eBay listings for new Shopify products"
                        checked={settings.autoList}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, autoList: value } : null)
                        }
                      />
                      
                      <Checkbox
                        label="Auto-end out of stock listings"
                        helpText="Automatically end eBay listings when Shopify inventory reaches zero"
                        checked={settings.autoEndOOS}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, autoEndOOS: value } : null)
                        }
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      <TextField
                        label="Sync interval (minutes)"
                        type="number"
                        value={settings.syncIntervalMinutes}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, syncIntervalMinutes: value } : null)
                        }
                        helpText="How often to check for changes and sync data"
                        autoComplete="off"
                      />

                      <Select
                        label="Sync mode"
                        options={syncModeOptions}
                        value={settings.syncMode}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, syncMode: value } : null)
                        }
                        helpText="How sync operations are triggered"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      <TextField
                        label="Price multiplier"
                        type="number"
                        value={settings.priceMultiplier}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, priceMultiplier: value } : null)
                        }
                        helpText="Multiply Shopify prices by this amount for eBay (e.g., 1.1 for 10% markup)"
                        step={0.01}
                        autoComplete="off"
                      />

                      <TextField
                        label="Inventory buffer"
                        type="number"
                        value={settings.inventoryBuffer}
                        onChange={(value) =>
                          setSettings(prev => prev ? { ...prev, inventoryBuffer: value } : null)
                        }
                        helpText="Reserve this many units in eBay (e.g., if Shopify has 10, eBay shows 8 with buffer of 2)"
                        autoComplete="off"
                      />
                    </div>

                    <TextField
                      label="Default item location"
                      value={settings.itemLocation}
                      onChange={(value) =>
                        setSettings(prev => prev ? { ...prev, itemLocation: value } : null)
                      }
                      helpText="Default location for new eBay listings (e.g., 'San Francisco, CA')"
                      autoComplete="off"
                    />
                  </BlockStack>
                </div>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Test Tools */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Text variant="headingLg" as="h2">Test Tools</Text>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Test various sync operations to ensure everything is working correctly
                  </Text>
                </div>
                <Button
                  icon={<TestTube className="w-4 h-4" />}
                  onClick={() => setShowTestModal(true)}
                >
                  View Test Results
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <Card>
                  <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div className="flex items-center justify-center mb-3">
                      <Package className="w-8 h-8 text-blue-500" />
                    </div>
                    <Text variant="headingMd" as="h4">Test Product Creation</Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Create a test product to verify eBay listing creation works properly.
                    </Text>
                    <div style={{ marginTop: '1rem' }}>
                      <Button
                        variant="primary"
                        size="slim"
                        onClick={() => runTest('create-product')}
                        loading={activeTest === 'create-product'}
                      >
                        Run Test
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div className="flex items-center justify-center mb-3">
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                    <Text variant="headingMd" as="h4">Test Price Update</Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Update a test product price to verify price sync functionality.
                    </Text>
                    <div style={{ marginTop: '1rem' }}>
                      <Button
                        variant="primary"
                        size="slim"
                        onClick={() => runTest('update-price')}
                        loading={activeTest === 'update-price'}
                      >
                        Run Test
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div className="flex items-center justify-center mb-3">
                      <ShoppingCart className="w-8 h-8 text-purple-500" />
                    </div>
                    <Text variant="headingMd" as="h4">Test Inventory Update</Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Update test inventory levels to verify inventory sync works.
                    </Text>
                    <div style={{ marginTop: '1rem' }}>
                      <Button
                        variant="primary"
                        size="slim"
                        onClick={() => runTest('update-inventory')}
                        loading={activeTest === 'update-inventory'}
                      >
                        Run Test
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Test Results Modal */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Test Results"
      >
        <Modal.Section>
          {Object.keys(testResults).length === 0 ? (
            <div className="text-center py-8">
              <Text variant="bodyLg" tone="subdued" as="p">
                No test results yet. Run some tests to see results here.
              </Text>
            </div>
          ) : (
            <BlockStack gap="400">
              {Object.entries(testResults).map(([testType, result]) => (
                <Card key={testType}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Text variant="bodyMd" fontWeight="semibold" as="span">
                        {testType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Test
                      </Text>
                      <Badge tone={result.success ? 'success' : 'critical'}>
                        {result.success ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    
                    <Text variant="bodyMd" as="p">{result.message}</Text>
                    
                    {result.details && (
                      <div className="mt-2">
                        <Text variant="bodySm" fontWeight="semibold" as="p">Details:</Text>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>

      {/* Toast */}
      {toastMessage && (
        <Toast
          content={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </Page>
  );
};

export default Settings;