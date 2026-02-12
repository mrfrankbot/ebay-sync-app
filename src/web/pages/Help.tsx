import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Collapsible,
  EmptyState,
  FormLayout,
  InlineStack,
  Layout,
  Modal,
  Page,
  Select,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../hooks/useApi';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  updated_at: string;
}

const Help: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch published FAQ
  const { data, isLoading, error } = useQuery({
    queryKey: ['help-faq'],
    queryFn: () => apiClient.get<{ data: FaqItem[]; total: number }>('/help/faq'),
  });

  // "Ask a Question" modal state
  const [askOpen, setAskOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [askedBy, setAskedBy] = useState('');

  // Track which FAQ items are expanded
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Search / filter
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Derive categories from FAQ data
  const categories = useMemo(() => {
    if (!data?.data) return [];
    const cats = new Set<string>();
    for (const item of data.data) {
      if (item.category) cats.add(item.category);
    }
    return Array.from(cats).sort();
  }, [data]);

  const categoryOptions = useMemo(
    () => [{ label: 'All categories', value: 'all' }, ...categories.map((c) => ({ label: c, value: c }))],
    [categories],
  );

  // Filtered FAQ items
  const filteredFaq = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.question.toLowerCase().includes(q) ||
          (item.answer && item.answer.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data, filterCategory, search]);

  // Submit question mutation
  const submitQuestion = useMutation({
    mutationFn: (body: { question: string; asked_by?: string; category?: string }) =>
      apiClient.post('/help/questions', body),
    onSuccess: () => {
      setAskOpen(false);
      setNewQuestion('');
      setNewCategory('');
      setAskedBy('');
      queryClient.invalidateQueries({ queryKey: ['help-faq'] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!newQuestion.trim()) return;
    submitQuestion.mutate({
      question: newQuestion.trim(),
      ...(askedBy.trim() ? { asked_by: askedBy.trim() } : {}),
      ...(newCategory.trim() ? { category: newCategory.trim() } : {}),
    });
  }, [newQuestion, askedBy, newCategory, submitQuestion]);

  if (isLoading) {
    return (
      <Page title="Help & FAQ">
        <Card>
          <Box padding="600">
            <InlineStack align="center">
              <Spinner size="large" accessibilityLabel="Loading FAQ" />
            </InlineStack>
          </Box>
        </Card>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Help & FAQ">
        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">
              Failed to load FAQ
            </Text>
            <Text as="p">{(error as Error).message}</Text>
          </BlockStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Help & FAQ"
      subtitle="Frequently asked questions and support"
      primaryAction={{
        content: 'Ask a Question',
        onAction: () => setAskOpen(true),
      }}
    >
      <Layout>
        {/* Search & filter */}
        <Layout.Section>
          <Card>
            <InlineStack gap="400" wrap>
              <Box minWidth="240px" width="50%">
                <TextField
                  label="Search FAQ"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search questions..."
                  clearButton
                  onClearButtonClick={() => setSearch('')}
                  autoComplete="off"
                />
              </Box>
              {categories.length > 0 && (
                <Box minWidth="200px">
                  <Select
                    label="Category"
                    options={categoryOptions}
                    value={filterCategory}
                    onChange={setFilterCategory}
                  />
                </Box>
              )}
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* FAQ items */}
        <Layout.Section>
          {filteredFaq.length === 0 ? (
            <Card>
              <EmptyState heading="No FAQ items found" image="">
                <Text as="p">
                  {search || filterCategory !== 'all'
                    ? 'Try adjusting your search or filter.'
                    : 'No published FAQ items yet. Ask a question to get started!'}
                </Text>
              </EmptyState>
            </Card>
          ) : (
            <BlockStack gap="300">
              {filteredFaq.map((item) => {
                const isOpen = expandedIds.has(item.id);
                return (
                  <Card key={item.id}>
                    <Box
                      paddingBlockStart="200"
                      paddingBlockEnd="200"
                    >
                      <BlockStack gap="200">
                        <div
                          onClick={() => toggleExpanded(item.id)}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') toggleExpanded(item.id);
                          }}
                        >
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="span">
                              {isOpen ? '▾' : '▸'} {item.question}
                            </Text>
                            {item.category && <Badge>{item.category}</Badge>}
                          </InlineStack>
                        </div>

                        <Collapsible open={isOpen} id={`faq-${item.id}`}>
                          <Box paddingInlineStart="400" paddingBlockStart="200">
                            <Text as="p">{item.answer}</Text>
                          </Box>
                        </Collapsible>
                      </BlockStack>
                    </Box>
                  </Card>
                );
              })}
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>

      {/* Ask a Question modal */}
      <Modal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="Ask a Question"
        primaryAction={{
          content: 'Submit',
          onAction: handleSubmit,
          loading: submitQuestion.isPending,
          disabled: !newQuestion.trim(),
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setAskOpen(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Your question"
              value={newQuestion}
              onChange={setNewQuestion}
              multiline={3}
              autoComplete="off"
              requiredIndicator
            />
            <TextField
              label="Your name (optional)"
              value={askedBy}
              onChange={setAskedBy}
              autoComplete="off"
            />
            <TextField
              label="Category (optional)"
              value={newCategory}
              onChange={setNewCategory}
              placeholder="e.g. Shipping, Returns, Products"
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
};

export default Help;
