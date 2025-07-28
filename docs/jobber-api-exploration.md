# Jobber API Exploration for v_late_jobs

## Current Data Gaps

Based on the codebase analysis, here are the fields we need but don't currently have:

### 1. **Date of Next Visit**
For recurring jobs, we need to know when the next scheduled visit is. This would require:
- **Jobber API Endpoint**: `/jobs/{id}/visits` or `/recurring_job_schedules`
- **Data Needed**: Next scheduled visit date for recurring jobs
- **Implementation**: Add to ETL pipeline or fetch on-demand

### 2. **Discount Applied**
To accurately track discounts, we need:
- **Jobber API Endpoint**: `/jobs/{id}` (full job details)
- **Data Needed**: 
  - Original quote amount
  - Final job amount
  - Any discount codes or adjustments applied
- **Calculation**: `discount = quoted_amount - final_amount`

### 3. **Job Notes/Comments**
For comprehensive notes and AI summaries:
- **Jobber API Endpoint**: `/jobs/{id}/notes` or included in `/jobs/{id}`
- **Data Needed**:
  - Internal notes
  - Client-visible notes
  - Job completion notes
  - Any issues or special instructions

### 4. **Job Status**
To properly identify "late" jobs vs completed jobs:
- **Jobber API Endpoint**: `/jobs/{id}`
- **Data Needed**:
  - Job status (scheduled, in-progress, completed, cancelled)
  - Actual completion date
  - Visit status for multi-visit jobs

## Proposed Jobber API Integration

### Option 1: Enhance ETL Pipeline
Add these fields to the nightly BigQuery sync:
```javascript
// Pseudo-code for enhanced job sync
async function syncJobsWithDetails() {
  const jobs = await jobberAPI.getJobs();
  
  for (const job of jobs) {
    // Get additional details
    const jobDetails = await jobberAPI.getJob(job.id);
    const visits = await jobberAPI.getJobVisits(job.id);
    const notes = await jobberAPI.getJobNotes(job.id);
    
    // Process and store in BigQuery
    const enhancedJob = {
      ...job,
      next_visit_date: visits[0]?.scheduled_date || null,
      discount_amount: calculateDiscount(job, jobDetails),
      notes: notes.map(n => n.content).join('\n'),
      status: jobDetails.status,
      completion_date: jobDetails.completion_date
    };
    
    await bigQuery.insert('jobber_jobs_enhanced', enhancedJob);
  }
}
```

### Option 2: Real-time API Calls
Create a Cloud Function that fetches additional data on-demand:
```javascript
// Cloud Function to get late job details
exports.getLateJobDetails = async (req, res) => {
  const { jobNumber } = req.query;
  
  try {
    // Get job details from Jobber
    const job = await jobberAPI.getJobByNumber(jobNumber);
    const visits = await jobberAPI.getJobVisits(job.id);
    const notes = await jobberAPI.getJobNotes(job.id);
    
    // Generate AI summary if requested
    let aiSummary = null;
    if (req.query.includeAISummary) {
      aiSummary = await generateAISummary(notes, job);
    }
    
    res.json({
      jobNumber,
      nextVisitDate: visits[0]?.scheduled_date,
      discount: job.discount_amount,
      notes: notes,
      aiSummary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## AI Summary Implementation

For generating AI summaries of job notes:

```javascript
async function generateAISummary(notes, jobDetails) {
  const prompt = `
    Summarize the following job information concisely:
    
    Job Type: ${jobDetails.job_type}
    Client: ${jobDetails.client_name}
    Scheduled Date: ${jobDetails.scheduled_date}
    Status: ${jobDetails.status}
    
    Notes:
    ${notes.map(n => `- ${n.created_at}: ${n.content}`).join('\n')}
    
    Provide a brief summary highlighting:
    1. Why the job might be late
    2. Any special requirements or issues
    3. Next steps needed
  `;
  
  // Call Claude API or OpenAI
  const response = await anthropic.complete({
    prompt,
    max_tokens: 150
  });
  
  return response.completion;
}
```

## Recommended Implementation Steps

1. **Immediate Solution**: Use the SQL view created with available data
2. **Short-term**: Add job status to existing ETL to better identify late vs completed jobs
3. **Medium-term**: Enhance ETL to include notes and next visit dates
4. **Long-term**: Implement AI summaries using Cloud Functions

## Sample Enhanced v_late_jobs View

Once we have the additional data:

```sql
CREATE OR REPLACE VIEW `jobber_data.v_late_jobs_enhanced` AS
SELECT 
  j.job_number,
  j.client_name as name,
  FORMAT_DATE('%Y-%m-%d', DATE(j.scheduled_date)) as date_of_visit,
  FORMAT_DATE('%Y-%m-%d', DATE(j.next_visit_date)) as date_of_next_visit,
  CONCAT('https://secure.getjobber.com/jobs/', j.job_number) as link_to_job,
  j.job_value as value,
  j.discount_amount as discount_applied,
  CASE 
    WHEN j.ai_summary IS NOT NULL THEN j.ai_summary
    ELSE j.notes
  END as notes,
  j.days_late,
  j.job_status,
  j.completion_date
FROM `jobber_data.jobs_enhanced` j
WHERE 
  j.scheduled_date < CURRENT_DATE('America/New_York')
  AND j.job_status IN ('scheduled', 'in_progress')
  AND j.days_late > 0
ORDER BY j.days_late DESC, j.job_value DESC;
```