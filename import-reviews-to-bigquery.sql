-- Import Google Reviews data into BigQuery
-- This script assumes you have already created the google_reviews table

-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS `jobber-data-warehouse-462721.jobber_data.google_reviews` (
  id STRING NOT NULL,
  author_name STRING NOT NULL,
  rating STRING NOT NULL,
  text STRING,
  time STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Clear existing data (optional - remove this line if you want to append)
DELETE FROM `jobber-data-warehouse-462721.jobber_data.google_reviews` WHERE 1=1;

-- Insert the reviews from your JSON file
INSERT INTO `jobber-data-warehouse-462721.jobber_data.google_reviews` (id, author_name, rating, text, time, created_at)
VALUES 
  ('review_003', 'Jennifer Rodriguez', '5', 'Exceptional service! The crew was courteous and efficient. Our home''s windows have never looked better.', '2 weeks ago', TIMESTAMP('2025-06-29 15:52:35.425060 UTC')),
  ('review_001', 'Sarah Mitchell', '5', 'Pink''s team did an amazing job on our storefront windows. Professional, punctual, and the results speak for themselves!', '2 days ago', TIMESTAMP('2025-06-29 15:52:35.425060 UTC')),
  ('review_002', 'Michael Chen', '5', 'Best window cleaning service in the Hudson Valley. They''ve been maintaining our office building for 2 years now.', '1 week ago', TIMESTAMP('2025-06-29 15:52:35.425060 UTC')),
  ('review_005', 'Lisa Anderson', '5', 'Regular commercial client here. Always reliable, always professional. Highly recommend!', '1 month ago', TIMESTAMP('2025-06-29 15:52:35.425060 UTC')),
  ('review_004', 'David Thompson', '5', 'Pink''s Windows cleaned all 47 windows in our Victorian home. Attention to detail was impressive!', '3 weeks ago', TIMESTAMP('2025-06-29 15:52:35.425060 UTC'));

-- Verify the import
SELECT COUNT(*) as total_reviews FROM `jobber-data-warehouse-462721.jobber_data.google_reviews`;
SELECT * FROM `jobber-data-warehouse-462721.jobber_data.google_reviews` ORDER BY created_at DESC;