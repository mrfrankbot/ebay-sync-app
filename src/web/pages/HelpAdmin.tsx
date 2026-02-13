import React, { useCallback, useMemo, useState } from 'react';
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
  Page,
  Select,
  Spinner,
  Tabs,
  Text,
  TextField,
} from '@shopify/polaris';
import type { TabProps } from '@shopify/polaris';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../hooks/useApi';

interface HelpQuestion {
  id: number;
  question: string;
  question_text?: string;
  title?: string;
  answer: string | null;
  status: string;
  asked_by: string | null;
  answered_by: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_TABS = ['all', 'pending', 'answered', 'published', 'archived'] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge tone="warning">Pending</Badge>;
    case 'answered':
      return <Badge tone="info">Answered</Badge>;
    case 'published':
      return <Badge tone="success">Published</Badge>;
    case 'archived':
      return <Badge>Archived</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const HelpAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Edit form state
  const [editAnswer, setEditAnswer] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const activeStatus = STATUS_TABS[selectedTab];

  // Fetch questions
  const { data, isLoading, error } = useQuery({
    queryKey: ['help-questions', activeStatus],
    queryFn: () => {
      const params = activeStatus === 'all' ? '' : `?status=${activeStatus}`;
      return apiClient.get<{ data: HelpQuestion[]; total: number }>(`/help/questions${params}`);
    },
  });

  // Update mutation
  const updateQuestion = useMutation({
    mutationFn: ({ id, ...body }: { id: number; answer?: string; status?: string; category?: string; answered_by?: string }) =>
      apiClient.put(`/help/questions/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-questions'] });
      queryClient.invalidateQueries({ queryKey: ['help-faq'] });
      setExpandedId(null);
    },
  });

  // Delete mutation
  const deleteQuestion = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/help/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-questions'] });
      queryClient.invalidateQueries({ queryKey: ['help-faq'] });
    },
  });

  const handleExpand = useCallback(
    (q: HelpQuestion) => {
      if (expandedId === q.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(q.id);
      setEditAnswer(q.answer || '');
      setEditCategory(q.category || '');
      setEditStatus(q.status);
    },
    [expandedId],
  );

  const handleSave = useCallback(
    (id: number) => {
      updateQuestion.mutate({
        id,
        answer: editAnswer,
        status: editStatus,
        category: editCategory || undefined,
        answered_by: 'Admin',
      });
    },
    [editAnswer, editStatus, editCategory, updateQuestion],
  );

  // Quick actions
  const handleQuickPublish = useCallback(
    (q: HelpQuestion) => {
      if (!q.answer) return;
      updateQuestion.mutate({ id: q.id, status: 'published' });
    },
    [updateQuestion],
  );

  const handleQuickArchive = useCallback(
    (q: HelpQuestion) => {
      updateQuestion.mutate({ id: q.id, status: 'archived' });
    },
    [updateQuestion],
  );

  const tabs: TabProps[] = STATUS_TABS.map((status) => ({
    id: status,
    content: status.charAt(0).toUpperCase() + status.slice(1),
    accessibilityLabel: `${status} questions`,
    panelID: `${status}-panel`,
  }));

  const questions = data?.data || [];

  if (isLoading) {
    return (
      <Page title="Help Admin">
        <Card>
          <Box padding="600">
            <InlineStack align="center">
              <Spinner size="large" accessibilityLabel="Loading questions" />
            </InlineStack>
          </Box>
        </Card>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Help Admin">
        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">
              Failed to load questions
            </Text>
            <Text as="p">{(error as Error).message}</Text>
          </BlockStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Help Admin" subtitle="Manage questions and FAQ content">
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box paddingBlockStart="400">
                {questions.length === 0 ? (
                  <EmptyState heading="No questions" image="">
                    <Text as="p">No {activeStatus === 'all' ? '' : activeStatus} questions found.</Text>
                  </EmptyState>
                ) : (
                  <BlockStack gap="300">
                    {questions.map((q) => {
                      const isExpanded = expandedId === q.id;
                      const questionText =
                        q.question || q.question_text || q.title || 'Untitled question';
                      return (
                        <Card key={q.id}>
                          <BlockStack gap="200">
                            {/* Header row */}
                            <div
                              onClick={() => handleExpand(q)}
                              style={{ cursor: 'pointer' }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleExpand(q);
                              }}
                            >
                              <InlineStack align="space-between" blockAlign="center" wrap>
                                <InlineStack gap="200" blockAlign="center" wrap>
                                  <Text variant="headingSm" as="span">
                                    {isExpanded ? '▾' : '▸'} #{q.id}
                                  </Text>
                                  <Text as="span" variant="bodyMd">
                                    {questionText.length > 80 ? questionText.slice(0, 80) + '…' : questionText}
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                  {q.category && <Badge>{q.category}</Badge>}
                                  {statusBadge(q.status)}
                                </InlineStack>
                              </InlineStack>
                            </div>

                            {/* Meta line */}
                            <InlineStack gap="400">
                              <Text as="span" tone="subdued" variant="bodySm">
                                {q.asked_by ? `Asked by ${q.asked_by}` : 'Anonymous'} ·{' '}
                                {new Date(q.created_at).toLocaleDateString()}
                              </Text>
                              <InlineStack gap="100">
                                {q.answer && q.status !== 'published' && (
                                  <Button size="slim" onClick={() => handleQuickPublish(q)}>
                                    Publish
                                  </Button>
                                )}
                                {q.status !== 'archived' && (
                                  <Button size="slim" onClick={() => handleQuickArchive(q)}>
                                    Archive
                                  </Button>
                                )}
                                <Button
                                  size="slim"
                                  tone="critical"
                                  onClick={() => {
                                    if (confirm(`Delete question #${q.id}?`)) {
                                      deleteQuestion.mutate(q.id);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </InlineStack>
                            </InlineStack>

                            {/* Expandable edit form */}
                            <Collapsible open={isExpanded} id={`edit-${q.id}`}>
                              <Box
                                paddingBlockStart="400"
                                paddingBlockEnd="200"
                                borderBlockStartWidth="025"
                                borderColor="border"
                              >
                                <FormLayout>
                                  <Text variant="headingSm" as="h3">
                                    Full question
                                  </Text>
                                  <Text as="p">{questionText}</Text>

                                  <TextField
                                    label="Answer"
                                    value={editAnswer}
                                    onChange={setEditAnswer}
                                    multiline={4}
                                    autoComplete="off"
                                  />
                                  <InlineStack gap="400" wrap>
                                    <Box minWidth="200px">
                                      <TextField
                                        label="Category"
                                        value={editCategory}
                                        onChange={setEditCategory}
                                        placeholder="e.g. Shipping, Returns"
                                        autoComplete="off"
                                      />
                                    </Box>
                                    <Box minWidth="200px">
                                      <Select
                                        label="Status"
                                        options={[
                                          { label: 'Pending', value: 'pending' },
                                          { label: 'Answered', value: 'answered' },
                                          { label: 'Published', value: 'published' },
                                          { label: 'Archived', value: 'archived' },
                                        ]}
                                        value={editStatus}
                                        onChange={setEditStatus}
                                      />
                                    </Box>
                                  </InlineStack>
                                  <InlineStack gap="200">
                                    <Button
                                      variant="primary"
                                      onClick={() => handleSave(q.id)}
                                      loading={updateQuestion.isPending}
                                    >
                                      Save
                                    </Button>
                                    <Button onClick={() => setExpandedId(null)}>Cancel</Button>
                                  </InlineStack>
                                </FormLayout>
                              </Box>
                            </Collapsible>
                          </BlockStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default HelpAdmin;
