# Schedule and Repeat Task Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-scheduling/services/task-scheduling.service.spec.ts`: schedule/due/deadline/recurrence requests and ordered saves.
- `due-date-picker.spec.ts`, `deadline-picker.spec.ts`, and `recurrence-picker.spec.ts`: date and repeat controls.
- `deadline-after-due-date.validator.spec.ts`, `recurrence-requires-due-date.validator.spec.ts`, and `recurrence-rule.validator.spec.ts`: cross-field schedule constraints.
- `date-format.util.spec.ts`, `recurrence-label.util.spec.ts`, and `occurrence-due.util.spec.ts`: timezone/date and repeat presentation.
- `frontend/src/app/features/tasks/task-crud/task-form/task-form.spec.ts`: combined form schedule payload and validation.

### Backend Unit

- `backend/src/features/tasks/task-scheduling/validators/recurrence-rule.validator.test.ts` and shared date validator tests cover accepted/rejected schedule inputs.
- `backend/src/features/tasks/task-scheduling/utils/recurrence-data.util.test.ts` and `next-occurrence.util.test.ts`: recurrence persistence and generated occurrence dates.
- `backend/src/features/tasks/task-scheduling/task-scheduling.service.test.ts`: schedule updates, archived-task rejection, and invalid deadlines.

### Postman, E2E, and Regression

- `tests/postman/07-task-crud/Project-Team-404 API - 07-task-crud.postman_collection.json`: task create/update scheduling payloads.
- `tests/postman/09-current-upcoming-tasks` and `10-overdue-tasks`: date-relative schedule and due-date behavior.
- `tests/postman/17-sprint-6-streaks-views`: recurring task setup and next-occurrence behavior.
- `tests/e2e/tasks/task-scheduling.e2e.spec.ts`: task date/repeat form behavior and persistence.
- `tests/regression/tasks/task-scheduling.regression.spec.ts`: recurring/schedule behavior through the API.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` exercises schedule fields with task create/edit; `sort-filter.integration.spec.ts` checks date-related task filtering.
