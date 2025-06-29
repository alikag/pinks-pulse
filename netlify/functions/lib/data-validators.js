/**
 * Data validation utilities for dashboard data
 */

// Validate and parse dates consistently
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle BigQuery date objects that come as { value: "2025-06-27" }
    if (typeof dateStr === 'object' && dateStr.value) {
      return new Date(dateStr.value + 'T00:00:00-05:00');
    }
    
    // Handle string dates
    if (typeof dateStr === 'string') {
      // If no time component, assume EST/EDT
      if (!dateStr.includes('T')) {
        return new Date(dateStr + 'T00:00:00-05:00');
      }
      return new Date(dateStr);
    }
    
    return new Date(dateStr);
  } catch (e) {
    console.error('Error parsing date:', dateStr, e);
    return null;
  }
}

// Validate numeric values
export function parseNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Validate quote data
export function validateQuote(quote) {
  return {
    quote_number: quote.quote_number || quote.Quote_Number || null,
    sent_date: parseDate(quote.sent_date || quote.Sent_Date),
    converted_date: parseDate(quote.converted_date || quote.Converted_Date),
    status: quote.status || quote.Status || 'unknown',
    salesperson: quote.salesperson || quote.Salesperson || 'Unknown',
    client_name: quote.client_name || quote.Client_Name || '',
    total_dollars: parseNumber(quote.total_dollars || quote.Total_Dollars || quote.value || quote.Value),
    job_number: quote.job_number || quote.Job_Number || null,
    job_date: parseDate(quote.job_date || quote.Job_Date),
    job_type: quote.job_type || quote.Job_Type || 'ONE_OFF'
  };
}

// Validate request data
export function validateRequest(request) {
  return {
    requested_on_date: parseDate(request.requested_on_date || request.Requested_On_Date),
    minutes_to_quote_sent: parseNumber(request.minutes_to_quote_sent || request.Minutes_To_Quote_Sent, null),
    quote_status: request.quote_status || request.Quote_Status || 'unknown',
    client_name: request.client_name || request.Client_Name || '',
    service_city: request.service_city || request.Service_City || ''
  };
}

// Validate job data
export function validateJob(job) {
  return {
    date: parseDate(job.Date || job.date || job.job_date),
    calculated_value: parseNumber(job.Calculated_Value || job.calculated_value || job.value),
    job_type: job.Job_type || job.job_type || job.Job_Type || 'ONE_OFF',
    status: job.Status || job.status || 'scheduled'
  };
}