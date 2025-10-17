### Logistics-v0 AI SDK Tools

Schema-verified tools for querying Supabase Logistics-v0 data. These tools are registered on the `logisticsAgent` in `lib/agents.ts`:

- getSitesCount
- getDeliveriesCountLastNDays
- getCollectionsCountLastNDays
- getDeliveriesCountByStatus
- getSitesByRegionCounts

Tables and key columns used:
- `sites`: `id`, `organization_id`, `region` ("north" | "south" | "central")
- `deliveries`: `id`, `organization_id`, `status` ("pending" | "in_progress" | "delivered" | "failed"), `created_at`
- `calendar_events`: `id`, `organization_id`, `event_type` (includes "collection"), `status` ("scheduled" | "in-progress" | "completed" | "cancelled"), `created_at`

Note: Time windows in these tools use `created_at` for filtering unless the prompt specifies a status, e.g., deliveries by status over the last N days.

### Example prompts (ready to run)

- General counts
  - "How many sites do we have?"
  - "How many sites are there for organization 00000000-0000-4000-8000-000000000000?"
  - "How many deliveries were created in the last 30 days?"
  - "How many deliveries were created in the last 7 days for organization 00000000-0000-4000-8000-000000000000?"

- Deliveries by status (deliveries.status ∈ {pending, in_progress, delivered, failed})
  - "Give me the count of delivered deliveries created in the last 14 days."
  - "How many in_progress deliveries were created in the last 3 days for organization 00000000-0000-4000-8000-000000000000?"
  - "Show a breakdown of deliveries by status over the past 30 days."
  - "Show a deliveries status breakdown for the last 60 days for organization 00000000-0000-4000-8000-000000000000."

- Collections via calendar events (calendar_events.event_type = "collection" and status ∈ {scheduled, in-progress, completed, cancelled})
  - "How many collection events were created in the last 30 days?"
  - "How many completed collection events were created in the last 14 days?"
  - "How many scheduled collection events were created in the past 7 days for organization 00000000-0000-4000-8000-000000000000?"

- Sites by region (sites.region ∈ {north, south, central})
  - "How many sites per region do we have?"
  - "Show sites count by region for organization 00000000-0000-4000-8000-000000000000."

### Notes
- Organization filter is optional and expects a UUID for `organization_id`.
- Day windows accept any integer N (1–90) per tool input constraints; default is 30.

