import { Router } from 'express';
import { getPipelineJobs, getPipelineJob } from '../../sync/pipeline-status.js';

const router = Router();

/**
 * GET /api/pipeline/jobs
 * List all pipeline jobs (most recent first).
 */
router.get('/api/pipeline/jobs', (_req, res) => {
  const jobs = getPipelineJobs();
  res.json({ jobs, count: jobs.length });
});

/**
 * GET /api/pipeline/jobs/:id
 * Get a single pipeline job by ID.
 */
router.get('/api/pipeline/jobs/:id', (req, res) => {
  const job = getPipelineJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

export default router;
