import { info } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Pipeline Status — in-memory job tracking for the auto-listing pipeline
// ---------------------------------------------------------------------------

export type StepName =
  | 'fetch_product'
  | 'generate_description'
  | 'process_images'
  | 'create_ebay_listing';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';
export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface PipelineStep {
  name: StepName;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  result?: string;
}

export interface PipelineJob {
  id: string;
  shopifyProductId: string;
  status: JobStatus;
  steps: PipelineStep[];
  createdAt: string;
  updatedAt: string;
}

// In-memory store (max 200 jobs to avoid leaks)
const MAX_JOBS = 200;
const jobs: Map<string, PipelineJob> = new Map();

const STEP_NAMES: StepName[] = [
  'fetch_product',
  'generate_description',
  'process_images',
  'create_ebay_listing',
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a new pipeline job and return its ID. */
export function createPipelineJob(shopifyProductId: string): string {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const job: PipelineJob = {
    id,
    shopifyProductId,
    status: 'queued',
    steps: STEP_NAMES.map((name) => ({ name, status: 'pending' as StepStatus })),
    createdAt: now,
    updatedAt: now,
  };

  // Evict oldest if at capacity
  if (jobs.size >= MAX_JOBS) {
    const oldest = jobs.keys().next().value;
    if (oldest) jobs.delete(oldest);
  }

  jobs.set(id, job);
  info(`[Pipeline] Created job ${id} for product ${shopifyProductId}`);
  return id;
}

/** Get all pipeline jobs (most recent first). */
export function getPipelineJobs(): PipelineJob[] {
  return Array.from(jobs.values()).reverse();
}

/** Get a single pipeline job by ID. */
export function getPipelineJob(id: string): PipelineJob | undefined {
  return jobs.get(id);
}

/** Mark the overall job as processing. */
export function startPipelineJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'processing';
  job.updatedAt = new Date().toISOString();
}

/** Update a specific step within a job. */
export function updatePipelineStep(
  jobId: string,
  stepName: StepName,
  status: StepStatus,
  result?: string,
): void {
  const job = jobs.get(jobId);
  if (!job) return;

  const step = job.steps.find((s) => s.name === stepName);
  if (!step) return;

  step.status = status;
  if (status === 'running') {
    step.startedAt = new Date().toISOString();
  }
  if (status === 'done' || status === 'error') {
    step.completedAt = new Date().toISOString();
  }
  if (result !== undefined) {
    step.result = result;
  }

  // Derive overall job status
  const allDone = job.steps.every((s) => s.status === 'done');
  const anyError = job.steps.some((s) => s.status === 'error');

  if (allDone) {
    job.status = 'done';
  } else if (anyError) {
    job.status = 'error';
  } else {
    job.status = 'processing';
  }

  job.updatedAt = new Date().toISOString();
}
