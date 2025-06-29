-- Create Google Reviews table in BigQuery
-- Run this in your BigQuery console

CREATE TABLE IF NOT EXISTS `jobber_data.google_reviews` (
  id STRING NOT NULL,
  author_name STRING NOT NULL,
  rating INT64 NOT NULL,
  text STRING,
  time STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Insert some sample reviews to get started
-- Replace with real customer reviews

INSERT INTO `jobber_data.google_reviews` (id, author_name, rating, text, time)
VALUES 
  ('review_001', 'Sarah Mitchell', 5, 
   'Pink\'s team did an amazing job on our storefront windows. Professional, punctual, and the results speak for themselves!', 
   '2 days ago'),
  
  ('review_002', 'Michael Chen', 5, 
   'Best window cleaning service in the Hudson Valley. They\'ve been maintaining our office building for 2 years now.', 
   '1 week ago'),
  
  ('review_003', 'Jennifer Rodriguez', 5, 
   'Exceptional service! The crew was courteous and efficient. Our home\'s windows have never looked better.', 
   '2 weeks ago'),
  
  ('review_004', 'David Thompson', 5, 
   'Pink\'s Windows cleaned all 47 windows in our Victorian home. Attention to detail was impressive!', 
   '3 weeks ago'),
  
  ('review_005', 'Lisa Anderson', 5, 
   'Regular commercial client here. Always reliable, always professional. Highly recommend!', 
   '1 month ago');

-- To add new reviews later:
-- INSERT INTO `jobber_data.google_reviews` (id, author_name, rating, text, time)
-- VALUES ('review_006', 'Customer Name', 5, 'Review text here', '1 day ago');