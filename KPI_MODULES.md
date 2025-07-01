# KPI Modules - Complete Guide to Every Metric

## 🎯 What This Document Is
This document explains EVERY number you see on the Pink's Pulse Dashboard. Each KPI (Key Performance Indicator) is broken down into:
- What it measures
- Why it matters
- How it's calculated
- Where the data comes from
- What "good" looks like

---

## 📊 KPI Card Metrics (Top of Dashboard)

### 1️⃣ Quotes Sent Today
**What it measures**: Number of quotes sent to customers today

**Why it matters**: 
- Shows sales team activity level
- More quotes = more potential revenue
- Daily activity indicator

**How it's calculated**:
```sql
COUNT(*) 
FROM quotes 
WHERE DATE(sent_date) = TODAY
  AND sent_date IS NOT NULL
```

**Target**: 12 quotes per day
- 🟢 Green: 12+ quotes (on track)
- 🟡 Yellow: 6-11 quotes (needs attention)
- 🔴 Red: <6 quotes (urgent action needed)

**Business Impact**: Each quote is a potential job. Low quote volume = future revenue problems.

---

### 2️⃣ Converted Today ($)
**What it measures**: Dollar value of quotes that became jobs TODAY

**Why it matters**:
- Shows actual revenue closed today
- Not when quote was sent, but when customer said YES
- Direct measure of sales success

**How it's calculated**:
```sql
SUM(total_dollars)
FROM quotes
WHERE DATE(converted_date) = TODAY
  AND status IN ('Converted', 'Won', 'Accepted', 'Complete')
```

**Target**: $100,000 per day
- 🟢 Green: $100k+ (excellent)
- 🟡 Yellow: $50k-99k (good)
- 🔴 Red: <$50k (needs improvement)

**Note**: A quote sent last week might convert today and count here!

---

### 3️⃣ Converted This Week ($)
**What it measures**: Total revenue from quotes converted Sun-Sat this week

**Why it matters**:
- Weekly revenue performance
- Shows if we're on track for monthly goals
- Includes count AND dollar value

**How it's calculated**:
```sql
SUM(total_dollars)
FROM quotes
WHERE converted_date >= SUNDAY_OF_THIS_WEEK
  AND converted_date < NEXT_SUNDAY
  AND status IN ('Converted', 'Won', 'Accepted', 'Complete')
```

**Target**: $157,500 per week
- 🟢 Green: $157.5k+ (on target)
- 🟡 Yellow: $100k-157k (close)
- 🔴 Red: <$100k (off track)

**Display Format**: "4 quotes - $5,384" (shows both count and value)

---

### 4️⃣ CVR This Week (%)
**What it measures**: Conversion Rate - percentage of quotes sent this week that converted

**Why it matters**:
- Quality indicator - are we sending good quotes?
- Efficiency metric - what % of effort becomes revenue?
- Early week might show 0% (normal!)

**How it's calculated**:
```sql
-- If quotes sent this week have conversions:
(Quotes_Sent_This_Week_That_Converted / Total_Quotes_Sent_This_Week) * 100

-- If NO conversions yet this week (like Monday morning):
-- Shows LAST WEEK'S rate with note "*Using last week's rate"
```

**Target**: 45% conversion rate
- 🟢 Green: 45%+ (excellent close rate)
- 🟡 Yellow: 30-44% (decent)
- 🔴 Red: <30% (needs coaching)

**Smart Logic**: Won't show 0% on Monday morning - uses last week as reference

---

### 5️⃣ 2026 Recurring Revenue
**What it measures**: Total value of RECURRING jobs scheduled for 2026

**Why it matters**:
- Future guaranteed revenue
- Shows business stability
- Recurring = predictable income

**How it's calculated**:
```sql
SUM(Calculated_Value)
FROM jobs
WHERE YEAR(job_date) = 2026
  AND Job_type = 'RECURRING'
```

**Target**: $1,000,000 (1 Million)
- 🟢 Green: $1M+ (goal achieved!)
- 🟡 Yellow: $750k-999k (getting close)
- 🔴 Red: <$750k (need more recurring)

**Business Strategy**: Recurring revenue is the holy grail - predictable, stable income

---

### 6️⃣ Next Month OTB
**What it measures**: "On The Books" - confirmed jobs scheduled for next month

**Why it matters**:
- Revenue visibility
- Cash flow planning
- Shows if next month is strong/weak

**How it's calculated**:
```sql
SUM(Calculated_Value)
FROM jobs
WHERE MONTH(job_date) = NEXT_MONTH
  AND YEAR(job_date) = CURRENT_OR_NEXT_YEAR
```

**Target**: $125,000 per month
- 🟢 Green: $125k+ (strong month ahead)
- 🟡 Yellow: $100k-124k (decent)
- 🔴 Red: <$100k (need more bookings)

**Updates**: On the 1st of each month

---

### 7️⃣ Speed to Lead (30D Avg)
**What it measures**: Average time from customer request to quote sent (last 30 days)

**Why it matters**:
- Faster response = higher close rate
- Customer expectation management
- Competitive advantage

**How it's calculated**:
```sql
AVG(TIMESTAMP_DIFF(sent_date, requested_on_date, MINUTE))
FROM quotes
WHERE sent_date >= TODAY - 30 DAYS
  AND requested_on_date IS NOT NULL
```

**Target**: 24 hours (1,440 minutes)
- 🟢 Green: ≤24 hours (excellent!)
- 🟡 Yellow: 24-48 hours (okay)
- 🔴 Red: >48 hours (too slow!)

**Display**: "2h 45m" format for readability

---

### 8️⃣ 30D CVR (%)
**What it measures**: 30-day rolling conversion rate

**Why it matters**:
- Longer-term conversion performance
- Smooths out daily variations
- Better statistical significance

**How it's calculated**:
```sql
(COUNT(converted quotes sent in last 30 days) / 
 COUNT(all quotes sent in last 30 days)) * 100
```

**Target**: 50% conversion rate
- 🟢 Green: 50%+ (top tier)
- 🟡 Yellow: 35-49% (solid)
- 🔴 Red: <35% (needs work)

**Display**: "77/140 converted" (shows the math)

---

### 9️⃣ Avg Quotes/Day (30D)
**What it measures**: Average quotes sent per day over last 30 days

**Why it matters**:
- Sales activity consistency
- Workload distribution
- Capacity planning

**How it's calculated**:
```sql
COUNT(quotes sent in last 30 days) / 30
```

**Target**: 12 quotes per day average
- 🟢 Green: 12+ (consistent activity)
- 🟡 Yellow: 6-11 (inconsistent)
- 🔴 Red: <6 (activity problem)

---

### 🔟 Reviews This Week
**What it measures**: New Google reviews received this week

**Why it matters**:
- Reputation building
- Social proof for sales
- SEO benefits

**How it's calculated**:
```sql
-- NOW: Scraped directly from Google Maps
-- Counts reviews shown on Google this week
```

**Target**: 2 reviews per week
- 🟢 Green: 2+ (good reputation building)
- 🟡 Yellow: 1 (okay)
- 🔴 Red: 0 (need review requests)

---

## 📈 Chart Explanations

### Converted This Week (Line Chart)
**What it shows**: 
- Orange line: Quotes SENT each day
- Blue line: Quotes CONVERTED each day (in dollars)
- X-axis: Days of the week (Sun-Sat)

**How to read it**: Look for the blue line to follow the orange line with a delay

---

### Weekly CVR % (Bar Chart)
**What it shows**: Conversion rate for quotes sent on each day

**Important**: This is BY SEND DATE, not conversion date
- Monday's bar = % of Monday's sent quotes that eventually converted
- Today might show 0% (quotes haven't had time to convert yet)

**Note at bottom**: "*By send date, not conversion date"

---

### Speed to Lead Distribution (Bar Chart)
**What it shows**: How fast we respond to requests

**Buckets**:
- 0-24 hours (Green - Excellent)
- 1-2 days (Light Green - Good)
- 2-3 days (Yellow - Fair)
- 3-4 days (Orange - Warning)
- 4-5 days (Red - Poor)
- 5-7 days (Dark Red - Critical)
- 7-14 days (Darker Red - Severe)
- 14+ days (Brown - Extreme)

**Goal**: Most bars should be in the green zone

---

### On The Books by Month (Bar Chart)
**What it shows**: Scheduled job revenue for each month of 2025

**Purpose**: See seasonal trends and plan resources

---

### On The Books by Week - 5 Week View
**What it shows**: 5 weeks of scheduled jobs (2 past, current, 2 future)

**Current week**: Highlighted in purple
**Purpose**: Near-term revenue visibility

---

## 👥 Additional Displays

### Salesperson Performance
**Shows**: Individual performance this week
- Quotes sent
- Quotes converted
- Dollar value
- Conversion rate
- Average speed to lead

**Sorted by**: Converted dollars (highest first)

---

### Converted Quotes Table
**Shows**: All quotes that converted this week
- When converted
- Quote details
- Salesperson
- Job type
- Value

**Purpose**: Detailed view of wins

---

### Google Reviews
**Shows**: Latest customer reviews from Google Maps
- Live data (not from database)
- Auto-scrolls through reviews
- Shows rating and review text

---

## 🎯 Using This Information

1. **Daily Check**: Look at "Quotes Sent Today" and "Speed to Lead"
2. **Weekly Review**: Focus on CVR This Week and Converted This Week
3. **Monthly Planning**: Check Next Month OTB and monthly chart
4. **Performance Issues**: Use salesperson table to identify coaching needs
5. **Customer Satisfaction**: Monitor reviews weekly

Remember: Click any KPI card to see the exact calculation formula!