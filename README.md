# TimeScapeEditor
## Download

- **Web Version**: [Visit TimeScape on GitHub Pages](https://williamjoyce.github.io/TimeScapeEditor/)
- **Mac Desktop App**: [Download from Releases](https://github.com/williamjoyce/TimeScapeEditor/releases/latest)

## Core Model And Flows

TimeScape is organized around three core pillars:

1. **Views**: Today's Report, This Week, Calendar
2. **Items**: Events, Tasks, Reminders
3. **Domains**: Personal, Household, Jobs

### Items Are The Foundation

- Items are the base records users create and manage.
- Every item should belong to exactly one domain.
- Items can optionally reference one bucket inside the selected domain.
- Views aggregate item records and present them as quick reports.

### Domains And Buckets

- Domains provide life-area context (Personal, Household, Jobs).
- Buckets provide reusable classification inside a domain.
- Buckets allow mixed item types (Event, Task, Reminder) to be grouped together.
- Buckets should support optional calibration defaults that can auto-fill compatible item fields.

### Jobs Calibration Direction

Jobs buckets are the first calibration target. Jobs buckets should support defaults for:

- Hourly pay rate
- Flat pay amount
- Default location

When a Jobs bucket is selected during item creation, compatible fields should auto-fill without overwriting explicit user-entered values.

### View Intent

- **Today's Report**: a focused daily operational summary
- **This Week**: a 7-day planning and prioritization surface
- **Calendar**: date-driven browsing and quick filtering across the selected month/day

Each view should make it easy to answer:

- What needs attention now?
- Which domain is most active?
- Which bucket groupings are driving current workload?

## Current Implementation Status

### In Place

- Core item CRUD flows for Events, Tasks, and Reminders
- Domain management screens for Personal, Household, and Jobs
- Bucket CRUD and bucket-to-item linking via item forms
- Shared localStorage persistence model

### In Progress

- Formal view pages for Today's Report, This Week, and Calendar
- Full consistency where every item path persists domain + optional bucket
- Jobs bucket calibration defaults and auto-fill behavior

### Not Yet Complete

- Advanced bucket-specific reports
- Rich analytics across domains and buckets
- Cross-device sync