import React, { useCallback, useEffect, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Collapsible,
  DataTable,
  Layout,
  Page,
  Select,
  Spinner,
  TextField,
  Toast,
  Text,
  ButtonGroup,
} from '@shopify/polaris';

type MappingType = 'edit_in_grid' | 'constant' | 'shopify_field' | 'formula';

type Mapping = {
  id: number;
  category: string;
  field_name: string;
  mapping_type: MappingType;
  source_value: string;
  target_value: string;
  variation_mapping: string | null;
  is_enabled: boolean;
  display_order: number;
};

type MappingsResponse = {
  sales: Mapping[];
  listing: Mapping[];
  payment: Mapping[];
  shipping: Mapping[];
};

const Mappings: React.FC = () => {
  const [mappings, setMappings] = useState<MappingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    sales: true,
    listing: false,
    payment: false,
    shipping: false,
  });

  const loadMappings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mappings');
      if (!response.ok) {
        throw new Error('Failed to load mappings');
      }
      const data = (await response.json()) as MappingsResponse;
      setMappings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMappings();
  }, [loadMappings]);

  const humanizeFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const humanizeCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      sales: 'Sales',
      listing: 'Listing',
      payment: 'Payment',
      shipping: 'Shipping',
    };
    return categoryMap[category] || category;
  };

  const mappingTypeOptions = [
    { label: 'Edit in Grid', value: 'edit_in_grid' },
    { label: 'Constant Value', value: 'constant' },
    { label: 'Shopify Field', value: 'shopify_field' },
    { label: 'Formula', value: 'formula' },
  ];

  const handleEditMapping = (mapping: Mapping) => {
    setEditingMapping({ ...mapping });
  };

  const handleSaveMapping = async () => {
    if (!editingMapping) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        mapping_type: editingMapping.mapping_type,
        source_value: editingMapping.source_value,
        target_value: editingMapping.target_value,
        variation_mapping: editingMapping.variation_mapping,
        is_enabled: editingMapping.is_enabled,
      };

      const response = await fetch(
        `/api/mappings/${editingMapping.category}/${editingMapping.field_name}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save mapping');
      }

      const updatedMapping = (await response.json()) as Mapping;

      // Update the mapping in the state
      setMappings((prev) => {
        if (!prev) return prev;
        const category = editingMapping.category as keyof MappingsResponse;
        return {
          ...prev,
          [category]: prev[category].map((m) =>
            m.field_name === editingMapping.field_name ? updatedMapping : m
          ),
        };
      });

      setEditingMapping(null);
      setToastMessage('Mapping saved successfully');
      setShowToast(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const renderMappingValue = (mapping: Mapping): string => {
    switch (mapping.mapping_type) {
      case 'constant':
        return mapping.target_value || '(empty)';
      case 'shopify_field':
        return mapping.source_value || '(not set)';
      case 'formula':
        return mapping.target_value || '(no formula)';
      case 'edit_in_grid':
        return 'Edit in grid';
      default:
        return '(unknown)';
    }
  };

  const renderCategorySection = (category: keyof MappingsResponse, categoryMappings: Mapping[]) => {
    const rows = categoryMappings.map((mapping) => {
      const isEditing = editingMapping?.field_name === mapping.field_name && 
                       editingMapping?.category === mapping.category;

      if (isEditing && editingMapping) {
        return [
          humanizeFieldName(mapping.field_name),
          <Select
            key={`type-${mapping.field_name}`}
            label="Mapping Type"
            labelHidden
            value={editingMapping.mapping_type}
            options={mappingTypeOptions}
            onChange={(value) =>
              setEditingMapping({
                ...editingMapping,
                mapping_type: value as MappingType,
              })
            }
          />,
          <TextField
            key={`value-${mapping.field_name}`}
            label="Value"
            labelHidden
            value={
              editingMapping.mapping_type === 'constant' || editingMapping.mapping_type === 'formula'
                ? editingMapping.target_value || ''
                : editingMapping.source_value || ''
            }
            onChange={(value) => {
              if (editingMapping.mapping_type === 'constant' || editingMapping.mapping_type === 'formula') {
                setEditingMapping({
                  ...editingMapping,
                  target_value: value,
                });
              } else {
                setEditingMapping({
                  ...editingMapping,
                  source_value: value,
                });
              }
            }}
            placeholder={
              editingMapping.mapping_type === 'constant'
                ? 'Enter constant value'
                : editingMapping.mapping_type === 'shopify_field'
                ? 'Enter Shopify field name'
                : editingMapping.mapping_type === 'formula'
                ? 'Enter formula'
                : 'Value not applicable'
            }
            disabled={editingMapping.mapping_type === 'edit_in_grid'}
            autoComplete="off"
          />,
          <ButtonGroup key={`actions-${mapping.field_name}`}>
            <Button variant="primary" onClick={handleSaveMapping} loading={saving} size="slim">
              Save
            </Button>
            <Button onClick={handleCancelEdit} size="slim">
              Cancel
            </Button>
          </ButtonGroup>,
        ];
      }

      return [
        humanizeFieldName(mapping.field_name),
        mappingTypeOptions.find((opt) => opt.value === mapping.mapping_type)?.label || mapping.mapping_type,
        renderMappingValue(mapping),
        <Button
          key={`edit-${mapping.field_name}`}
          onClick={() => handleEditMapping(mapping)}
          size="slim"
          disabled={editingMapping !== null}
        >
          Edit
        </Button>,
      ];
    });

    return (
      <Card key={category}>
        <div style={{ cursor: 'pointer' }} onClick={() => toggleCategory(category)}>
          <Text variant="headingMd" as="h3">
            {humanizeCategory(category)} ({categoryMappings.length} mappings)
          </Text>
        </div>
        <Collapsible open={openCategories[category]} id={`${category}-mappings`}>
          <div style={{ marginTop: '16px' }}>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text']}
              headings={['Field Name', 'Mapping Type', 'Current Value', 'Actions']}
              rows={rows}
              footerContent={`${categoryMappings.length} mapping${categoryMappings.length === 1 ? '' : 's'}`}
            />
          </div>
        </Collapsible>
      </Card>
    );
  };

  return (
    <Page title="Mappings">
      {error && (
        <Banner tone="critical" title="Something went wrong">
          <p>{error}</p>
        </Banner>
      )}
      {loading && (
        <Layout>
          <Layout.Section>
            <Card>
              <Spinner accessibilityLabel="Loading mappings" size="large" />
            </Card>
          </Layout.Section>
        </Layout>
      )}
      {!loading && mappings && (
        <Layout>
          <Layout.Section>
            <Text variant="bodyMd" as="p" tone="subdued">
              Configure how eBay listing fields are mapped from Shopify product data. 
              Click category headers to expand/collapse sections.
            </Text>
          </Layout.Section>
          <Layout.Section>
            <Layout>
              <Layout.Section>
                {renderCategorySection('sales', mappings.sales)}
              </Layout.Section>
              <Layout.Section>
                {renderCategorySection('listing', mappings.listing)}
              </Layout.Section>
              <Layout.Section>
                {renderCategorySection('payment', mappings.payment)}
              </Layout.Section>
              <Layout.Section>
                {renderCategorySection('shipping', mappings.shipping)}
              </Layout.Section>
            </Layout>
          </Layout.Section>
        </Layout>
      )}
      {showToast && (
        <Toast 
          content={toastMessage} 
          onDismiss={() => setShowToast(false)} 
        />
      )}
    </Page>
  );
};

export default Mappings;