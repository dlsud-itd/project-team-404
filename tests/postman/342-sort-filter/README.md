# Task and Project Sorting & Filtering Postman Guide

The `342-sort-filter` collection checks task and project filters, stable ordering, pagination, invalid values, and missing authentication. The requests are read-only apart from the login session.

## Requirements

- Start the backend API at `http://localhost:3000`.
- Apply the Supabase migrations and seed files, including `supabase/seeds/006_filtering.sql`, for Harvey's filter fixtures.
- Import the collection and `Project-Team-404 Local (342-sort-filter).postman_environment.json`, then select that environment.

The collection captures Harvey's token, the fixture label IDs, and active project IDs automatically. Run every request in the `342-sort-filter` folder in its existing order. The filter and sorting matrix requests issue the individual query cases with `pm.sendRequest`; their assertions appear in that request's test results.

## Cases covered

- Legacy and multi-value priority and label filters, `labelMatch=any|all`, individual and combined filters.
- Inclusive due-date boundaries, due-date presence, overdue completion exclusion, recurrence, status, and project ID filters.
- Every task and project sort key in both directions, including nulls-last task date sorting and stable ID tie-breakers.
- Project favorite/archive/color filters, limited response totals, and the unchanged array response without `limit`.
- Invalid task/project query values return `400`; missing tokens return `401`.

Do not point the environment at production or a shared database. The collection does not reset or mutate application records.
