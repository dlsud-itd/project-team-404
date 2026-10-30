# Sprint 2 Test Matrix

Last Updated: October 30, 2026

## Overview

Combined backend and frontend test cases for Sprint 2 (Projects), based on API Specification v1.1, Section II (`/api/projects`): Project Listing & Retrieval, Project Creation, Project Editing, Favorite / Archive / Sort Order, and Project Deletion. Section 6 covers the public landing page at `/` and section 7 the signed-in Home dashboard at `/home`; neither calls a projects or tasks API yet. Test IDs keep the Sprint 1 convention: `BE` for backend and `FE` for frontend.

Every `/api/projects` endpoint requires `Authorization: Bearer <token>` from `/api/auth/login` and only returns data owned by the authenticated user. Projects are stored in `tbl_project`. Deletion is soft (`deleted_at` is set), and soft-deleted projects are treated as not found.

Frontend integration tests use the app's real routes, services, and `HttpClient`; only network requests are faked with `HttpTestingController`. Run with `npm test` from `frontend`.

Backend integration tests belong in `backend/tests/integration/features` and run with `npm run test:integration` from `backend`, against the isolated Supabase test project described in the Sprint 1 matrix (`SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, `SUPABASE_TEST_DATABASE_URL`).

Project CRUD integration tests use the production app and its real authenticated router. They follow the current backend contract: create returns 201, updates use PATCH, and list filtering uses `isArchived`. The API specification describes different values (200, PUT, and `archived`); reconcile the spec and implementation separately. The current list API has no pagination parameters.

Frontend project routes are `/projects` (list), `/projects/new` (create page) and `/projects/:projectId/edit` (edit page), all behind `authGuard`. Rows written for a sidebar, an "Add project" dialog or a `/projects/:projectId` view are checked against these pages; rows for screens that do not exist yet (single project view, Archived view, inline rename, project menu) stay Failing.

Status values: `Failing`, `Passing`, `Blocked`.

## 1. Project Listing & Retrieval

### 1.1 List Projects API

| ID        | Test Case                                        | Expected Result                                                                              | Status  |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------- |
| BE-LST-01 | GET `/api/projects` with a valid token           | 200 OK; array of the user's projects with `id`, name, description, color, and project flags. | Blocked |
| BE-LST-02 | List projects for any user                       | The user's Inbox is included and listed first.                                               | Blocked |
| BE-LST-03 | List several projects with different `sortOrder` | Non-Inbox projects are ordered by `sortOrder`.                                               | Blocked |
| BE-LST-04 | GET `/api/projects?isArchived=true`              | Only archived projects are returned.                                                         | Blocked |
| BE-LST-05 | GET `/api/projects?isArchived=false`             | Only active projects are returned.                                                           | Blocked |
| BE-LST-06 | GET `/api/projects` without `isArchived`         | Both active and archived projects are returned.                                              | Blocked |
| BE-LST-07 | List after a project is soft-deleted             | Soft-deleted project is not returned.                                                        | Blocked |
| BE-LST-08 | List while another user has projects             | Only the authenticated user's projects are returned.                                         | Blocked |
| BE-LST-09 | GET `/api/projects` with no valid token          | 401 Unauthorized.                                                                            | Blocked |
| BE-LST-10 | GET `/api/projects?isArchived=abc`               | 400 Bad Request; `isArchived` must be `true` or `false`.                                     | Blocked |

### 1.2 Get Project API

| ID        | Test Case                                       | Expected Result                                   | Status  |
| --------- | ----------------------------------------------- | ------------------------------------------------- | ------- |
| BE-LST-11 | GET `/api/projects/{projectId}` for own project | 200 OK; returns the owned project.                | Blocked |
| BE-LST-12 | Get own Inbox project                           | 200 OK; `isInbox: true`.                          | Blocked |
| BE-LST-13 | Get another user's project                      | 404 Not Found; project existence is not revealed. | Blocked |
| BE-LST-14 | Get a project ID that does not exist            | 404 Not Found.                                    | Blocked |
| BE-LST-15 | Get a soft-deleted project                      | 404 Not Found.                                    | Blocked |
| BE-LST-16 | Get with a non-numeric `projectId` (e.g. `abc`) | 400 Bad Request.                                  | Blocked |
| BE-LST-17 | GET `/api/projects/{projectId}` with no token   | 401 Unauthorized.                                 | Blocked |

### 1.3 Listing & Retrieval Backend Integration Tests

| ID        | Test Case                                    | Expected Result                                  | Status  |
| --------- | -------------------------------------------- | ------------------------------------------------ | ------- |
| BE-LST-18 | List projects for two test users in Supabase | Only the signed-in user's projects are returned. | Blocked |
| BE-LST-19 | List projects for a new test user            | The user's Inbox is returned.                    | Blocked |

### 1.4 Project List UI

| ID        | Test Case                                    | Expected Result                                                                | Status  |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ------- |
| FE-LST-01 | Open the app while logged in                 | Sidebar shows Inbox first, then projects in `sortOrder` with name and color.   | Passing |
| FE-LST-02 | View the Inbox entry                         | Inbox is visually distinct and has no archive or delete actions.               | Passing |
| FE-LST-03 | View favorite projects                       | Favorite projects appear in a Favorites section.                               | Failing |
| FE-LST-04 | View archived projects                       | Archived projects are hidden from the main list and shown in an Archived view. | Failing |
| FE-LST-05 | User has only the Inbox                      | Empty state invites the user to create a project.                              | Passing |
| FE-LST-06 | Load the project list                        | Loading state is shown until the list request finishes.                        | Passing |
| FE-LST-07 | List request returns 500 or a network error  | Error is shown with a retry action.                                            | Passing |
| FE-LST-08 | Click a project in the list                  | Navigates to `/projects/:projectId` showing name, description, and color.      | Failing |
| FE-LST-09 | Open `/projects/:projectId` that returns 404 | "Project not found" message with a link back to Inbox.                         | Failing |
| FE-LST-10 | Visit a project route while unauthenticated  | User is redirected to `/login`.                                                | Passing |

### 1.5 Listing & Retrieval Frontend Integration Tests

| ID        | Test Case                   | Expected Result                                                       | Status  |
| --------- | --------------------------- | --------------------------------------------------------------------- | ------- |
| FE-LST-11 | Load the project list       | Calls `GET /api/projects` with the token in the Authorization header. | Passing |
| FE-LST-12 | Open the Archived view      | Calls `GET /api/projects?archived=true`.                              | Failing |
| FE-LST-13 | Open a project              | Calls `GET /api/projects/{projectId}` with the route's ID.            | Passing |
| FE-LST-14 | Project request returns 401 | Session is cleared; user is redirected to `/login`.                   | Passing |

Tests: `frontend/tests/integration/features/projects/projects.integration.spec.ts`. They run through the real `/projects` routes behind `authGuard`, `ProjectService`, `ProjectsStore`, the project-permissions util and `authInterceptor`; the user is signed in by restoring a stored token and answering `GET /api/auth/me`. Response bodies follow `backend/src/features/projects/project-crud`.

- FE-LST-01 and FE-LST-02 are checked on the `/projects` page (Inbox first, then by `sortOrder`, with name, description and color swatch; the Inbox card has a Read-only badge and no edit or delete controls). There is no sidebar list yet.
- FE-LST-13 is checked through the edit page, which calls `GET /api/projects/{projectId}` with the route's ID. FE-LST-08, FE-LST-09 and FE-LST-12 need the single project view and Archived view, which do not exist yet.
- The backend returns each project's ID as `id`; `ProjectService` converts it to `projectId` for the app. Before this fix, card links pointed to `/projects/undefined/edit`.
- The list filter is sent as `isArchived`, as the backend expects (see Open Questions).

### 1.6 Listing & Retrieval End-to-End

| ID        | Test Case                                   | Expected Result                                      | Status  |
| --------- | ------------------------------------------- | ---------------------------------------------------- | ------- |
| FE-LST-15 | Log in, see the sidebar, and open the Inbox | Inbox is listed first and opens in one browser flow. | Failing |

## 2. Project Creation

### 2.1 Create Project API

| ID        | Test Case                                              | Expected Result                                                           | Status  |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | ------- |
| BE-CRT-01 | POST `/api/projects` with name, description, and color | 201 Created; project belongs to the caller and has the supplied details.  | Blocked |
| BE-CRT-02 | Create with `is_inbox: true`                           | 400 Bad Request; unsupported field is rejected and no project is created. | Blocked |
| BE-CRT-03 | Create with missing `name`                             | 400 Bad Request; `{"error": "Project name is required"}`.                 | Failing |
| BE-CRT-04 | Create with an empty `name`                            | 400 Bad Request.                                                          | Blocked |
| BE-CRT-05 | Create with a 151-character name                       | 400 Bad Request; the project is not created.                              | Blocked |
| BE-CRT-06 | Create with a 501-character description                | 400 Bad Request; a 500-character description is accepted.                 | Failing |
| BE-CRT-07 | Create with an invalid color                           | 400 Bad Request; the project is not created.                              | Blocked |
| BE-CRT-08 | Create with negative `sortOrder`                       | 400 Bad Request.                                                          | Failing |
| BE-CRT-09 | Check created project defaults                         | In the database, `is_inbox` is false and `deleted_at` is empty.           | Blocked |
| BE-CRT-10 | Create with `projectId` or `userId` in the body        | Fields are ignored; project is owned by the authenticated user.           | Failing |
| BE-CRT-11 | POST `/api/projects` with no valid token               | 401 Unauthorized; no project is created.                                  | Blocked |

### 2.2 Creation Backend Integration Tests

| ID        | Test Case                                   | Expected Result                                                                               | Status  |
| --------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| BE-CRT-12 | Create a project and check its database row | Row belongs to the caller; details are saved, `is_inbox` is false, and `deleted_at` is empty. | Blocked |
| BE-CRT-13 | Create a project, then list projects        | New project appears in `GET /api/projects`.                                                   | Blocked |

### 2.3 Create Project UI

| ID        | Test Case                                         | Expected Result                                                              | Status  |
| --------- | ------------------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| FE-CRT-01 | Open the "Add project" dialog                     | Name, description, color picker, and submit button are shown.                | Passing |
| FE-CRT-02 | Submit with an empty name                         | Required-field error is shown; no API call is made.                          | Passing |
| FE-CRT-03 | Enter name over 150 or description over 500 chars | Inline maximum-length error is shown; submit is blocked.                     | Passing |
| FE-CRT-04 | Choose a color                                    | Only valid hex colors can be selected.                                       | Passing |
| FE-CRT-05 | Submit the create form                            | Button is disabled and loading state shown; duplicate submits are prevented. | Passing |
| FE-CRT-06 | Create succeeds                                   | Dialog closes; new project appears in the sidebar without a reload.          | Passing |
| FE-CRT-07 | Create returns 400                                | Server error message is shown; form values are preserved.                    | Passing |
| FE-CRT-08 | Create returns 500 or a network error             | Generic error is shown; user can retry.                                      | Passing |
| FE-CRT-09 | Cancel the dialog                                 | Dialog closes; no API call is made.                                          | Passing |
| FE-CRT-10 | Use the dialog with a keyboard                    | Fields have labels and logical tab order; Enter submits; Escape closes.      | Failing |

### 2.4 Creation Frontend Integration Tests

| ID        | Test Case                         | Expected Result                                                                                                       | Status  |
| --------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-CRT-11 | Submit a valid project            | Calls `POST /api/projects` with `name`, `description`, `color`; never sends `isInbox`, `isFavorite`, or `isArchived`. | Passing |
| FE-CRT-12 | Submit with optional fields empty | `description` and `color` are sent as null or omitted, never as empty strings.                                        | Passing |

- Create is a page at `/projects/new`, not a dialog. FE-CRT-06: on 201 the app returns to `/projects`, which reloads the list and shows the new card without a page reload. FE-CRT-09: Cancel returns to the list and sends no POST.
- FE-CRT-07: a 400's `details` field (`name`, `description` or `color`) puts a readable message on that field, because the backend's own detail text is Zod's ("Too big: expected string to have <=150 characters"). A 400 without a usable field shows the `error` text above the form.

### 2.5 Creation End-to-End

| ID        | Test Case                                    | Expected Result                                | Status  |
| --------- | -------------------------------------------- | ---------------------------------------------- | ------- |
| FE-CRT-13 | Create a project, refresh, and find it again | Project is still in the sidebar after refresh. | Failing |

## 3. Project Editing

### 3.1 Update Project API

| ID        | Test Case                                                           | Expected Result                                               | Status  |
| --------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| BE-EDT-01 | PATCH `/api/projects/{projectId}` with name, description, and color | 200 OK; all three values are saved.                           | Blocked |
| BE-EDT-02 | Update with only `description` in the body                          | Only description changes; name and color are unchanged.       | Failing |
| BE-EDT-03 | Update with empty `name`                                            | 400 Bad Request; `{"error": "Project name cannot be empty"}`. | Failing |
| BE-EDT-04 | Update with name over 150 or description over 500 chars             | 400 Bad Request; project is unchanged.                        | Failing |
| BE-EDT-05 | Update with invalid color                                           | 400 Bad Request; project is unchanged.                        | Failing |
| BE-EDT-06 | Update with `isFavorite`, `isArchived`, `sortOrder`, or `isInbox`   | Fields are ignored; those values are unchanged.               | Failing |
| BE-EDT-07 | Update another user's or a nonexistent project                      | 404 Not Found; no row is changed.                             | Blocked |
| BE-EDT-08 | PATCH `/api/projects/{projectId}` with no valid token               | 401 Unauthorized.                                             | Blocked |

### 3.2 Rename Project API

| ID        | Test Case                                                     | Expected Result                                                       | Status  |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| BE-EDT-09 | PUT `/api/projects/{projectId}/name` with valid name          | 200 OK; `{projectId, name, message: "Project renamed successfully"}`. | Failing |
| BE-EDT-10 | Rename with missing or empty name                             | 400 Bad Request; `{"error": "Project name is required"}`.             | Failing |
| BE-EDT-11 | Rename with a 151-character name                              | 400 Bad Request.                                                      | Failing |
| BE-EDT-12 | Rename with extra fields (`description`, `color`) in the body | Only the name changes.                                                | Failing |
| BE-EDT-13 | Rename another user's or a nonexistent project                | 404 Not Found.                                                        | Failing |

### 3.3 Update Project Description API

| ID        | Test Case                                                    | Expected Result                                                             | Status  |
| --------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- | ------- |
| BE-EDT-14 | PUT `/api/projects/{projectId}/description` with valid text  | 200 OK; `{projectId, description, message}`.                                | Failing |
| BE-EDT-15 | Update description to `null`                                 | 200 OK; description is cleared.                                             | Failing |
| BE-EDT-16 | Update with a 501-character description                      | 400 Bad Request; `{"error": "Description must be at most 500 characters"}`. | Failing |
| BE-EDT-17 | Update another user's or a nonexistent project's description | 404 Not Found.                                                              | Failing |

### 3.4 Update Project Color API

| ID        | Test Case                                              | Expected Result                                       | Status  |
| --------- | ------------------------------------------------------ | ----------------------------------------------------- | ------- |
| BE-EDT-18 | PUT `/api/projects/{projectId}/color` with valid hex   | 200 OK; `{projectId, color, message}`.                | Failing |
| BE-EDT-19 | Update color to `null`                                 | 200 OK; color is removed.                             | Failing |
| BE-EDT-20 | Update with invalid color                              | 400 Bad Request; `{"error": "Invalid color format"}`. | Failing |
| BE-EDT-21 | Update another user's or a nonexistent project's color | 404 Not Found.                                        | Failing |
| BE-EDT-22 | Call rename, description, or color with no token       | 401 Unauthorized.                                     | Failing |

### 3.5 Editing Backend Integration Tests

| ID        | Test Case                                     | Expected Result                                                                                                                     | Status  |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-EDT-23 | Update a project, then re-fetch from database | Values are saved and `updated_at` advances; another user's project returns 404 unchanged; updating the Inbox is rejected unchanged. | Blocked |

### 3.6 Edit Project UI

| ID        | Test Case                                   | Expected Result                                                               | Status  |
| --------- | ------------------------------------------- | ----------------------------------------------------------------------------- | ------- |
| FE-EDT-01 | Open the Edit Project form                  | Name, description, and color are pre-filled with current values.              | Passing |
| FE-EDT-02 | Clear the name and submit                   | Required-field error is shown; no API call is made.                           | Passing |
| FE-EDT-03 | Enter name over 150 or description over 500 | Inline maximum-length error is shown; submit is blocked.                      | Failing |
| FE-EDT-04 | Open the form without changing fields       | Save is enabled only when the form is dirty.                                  | Passing |
| FE-EDT-05 | Submit the edit form                        | Button is disabled and loading state shown; duplicate submits are prevented.  | Passing |
| FE-EDT-06 | Save valid changes                          | Success message is shown; sidebar and project header update without a reload. | Passing |
| FE-EDT-07 | Save returns 400                            | Error is shown on the relevant field; edits are preserved.                    | Passing |
| FE-EDT-08 | Save returns 404                            | "Project not found" is shown; project list is refreshed.                      | Passing |
| FE-EDT-09 | Save returns 500 or a network error         | Generic error is shown; edits are preserved.                                  | Passing |
| FE-EDT-10 | Rename a project inline from the sidebar    | Enter saves the new name; Escape cancels and restores the old name.           | Failing |
| FE-EDT-11 | Change color from the project menu          | Project color chip updates in the sidebar.                                    | Failing |

### 3.7 Editing Frontend Integration Tests

| ID        | Test Case                  | Expected Result                                                                         | Status  |
| --------- | -------------------------- | --------------------------------------------------------------------------------------- | ------- |
| FE-EDT-12 | Save the Edit Project form | Calls `PATCH /api/projects/{projectId}` with only changed `name`/`description`/`color`. | Passing |
| FE-EDT-13 | Rename inline              | Calls `PUT /api/projects/{projectId}/name` with only `name`.                            | Failing |
| FE-EDT-14 | Clear the description      | Calls `PUT /api/projects/{projectId}/description` with `description: null`.             | Failing |
| FE-EDT-15 | Remove the color           | Calls `PUT /api/projects/{projectId}/color` with `color: null`.                         | Failing |

- FE-EDT-12 now matches the backend: `PATCH`, not `PUT`, and the response is the saved project, which replaces the one in `ProjectsStore`. FE-EDT-13 to FE-EDT-15 (`/name`, `/description`, `/color` sub-routes) are not used by the frontend and stay Failing.
- FE-EDT-06: there is no sidebar or project header yet; the saved values show in the form and in the shared `ProjectsStore`.
- FE-EDT-08: a 404 on save returns to `/projects`, which reloads the list without the project and shows "Project not found.".
- A 403 (`Inbox project cannot be edited or deleted`) shows "Your Inbox is read-only, so it can't be changed.". Opening the Inbox's edit URL directly shows the read-only message with no form.

### 3.8 Editing End-to-End

| ID        | Test Case                                                | Expected Result                               | Status  |
| --------- | -------------------------------------------------------- | --------------------------------------------- | ------- |
| FE-EDT-16 | Edit name, description, and color, then refresh the page | Updated values are still shown after refresh. | Failing |

## 4. Favorite, Archive & Sort Order

### 4.1 Favorite / Unfavorite Project API

| ID        | Test Case                                                        | Expected Result                                                                 | Status  |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| BE-ORG-01 | PUT `/api/projects/{projectId}/favorite` with `isFavorite: true` | 200 OK; `{projectId, isFavorite: true, message: "Project added to favorites"}`. | Failing |
| BE-ORG-02 | Favorite request with `isFavorite: false`                        | 200 OK; `isFavorite: false`.                                                    | Failing |
| BE-ORG-03 | Favorite request with missing `isFavorite`                       | 400 Bad Request; `{"error": "isFavorite is required"}`.                         | Failing |
| BE-ORG-04 | Favorite request with non-boolean value (`"yes"`)                | 400 Bad Request.                                                                | Failing |
| BE-ORG-05 | Favorite another user's or a nonexistent project                 | 404 Not Found.                                                                  | Failing |

### 4.2 Archive / Unarchive Project API

| ID        | Test Case                                                       | Expected Result                                                                       | Status  |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| BE-ORG-06 | PUT `/api/projects/{projectId}/archive` with `isArchived: true` | 200 OK; project appears in `?isArchived=true` and not in `?isArchived=false`.         | Failing |
| BE-ORG-07 | Archive request with `isArchived: false`                        | 200 OK; `{"message": "Project restored from archive"}`; project is active again.      | Failing |
| BE-ORG-08 | Archive the Inbox project                                       | 400 Bad Request; `{"error": "Inbox project cannot be archived"}`; Inbox is unchanged. | Failing |
| BE-ORG-09 | Archive request with missing or non-boolean `isArchived`        | 400 Bad Request.                                                                      | Failing |
| BE-ORG-10 | Archive another user's or a nonexistent project                 | 404 Not Found.                                                                        | Failing |

### 4.3 Update Project Sort Order API

| ID        | Test Case                                                    | Expected Result                                                  | Status  |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------- | ------- |
| BE-ORG-11 | PUT `/api/projects/{projectId}/sort-order` with valid value  | 200 OK; `{projectId, sortOrder, message}`.                       | Failing |
| BE-ORG-12 | Sort order request with negative `sortOrder`                 | 400 Bad Request; `{"error": "Sort order must be 0 or greater"}`. | Failing |
| BE-ORG-13 | Sort order request with non-integer value (`1.5`, `"a"`)     | 400 Bad Request.                                                 | Failing |
| BE-ORG-14 | Change sort order, then list projects                        | List reflects the new order; Inbox is still first.               | Failing |
| BE-ORG-15 | Change sort order of another user's or a nonexistent project | 404 Not Found.                                                   | Failing |
| BE-ORG-16 | Call favorite, archive, or sort-order with no token          | 401 Unauthorized.                                                | Failing |

### 4.4 Favorite, Archive & Sort Order Backend Integration Tests

| ID        | Test Case                                                 | Expected Result                                                                                                                     | Status  |
| --------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-ORG-17 | Favorite and unfavorite a project, then check it again    | `is_favorite` is saved and repeated requests keep the requested value.                                                              | Blocked |
| BE-ORG-18 | Archive and restore a project, then check the lists       | `is_archived` is saved; the project moves between active and archived lists.                                                        | Blocked |
| BE-ORG-19 | Try to archive the Inbox or change another user's project | Inbox stays unchanged; another user's project returns 404 and stays unchanged.                                                      | Blocked |
| BE-ORG-20 | Reorder projects and check the database and list          | `sort_order` is saved and the list matches the requested order.                                                                     | Blocked |
| BE-ORG-21 | Submit an invalid reorder list                            | Empty or malformed lists return 400; duplicate IDs return 400; unknown or another user's IDs return 404 without changing the order. | Blocked |
| BE-ORG-22 | Reorder projects at the same time                         | Both requests complete and the final list matches one complete requested order.                                                     | Blocked |
| BE-ORG-23 | Use organization routes without a token                   | Favorite, archive, reorder, and sort-order requests return 401.                                                                     | Blocked |

### 4.5 Favorite, Archive & Sort Order UI

| ID        | Test Case                                      | Expected Result                                                              | Status  |
| --------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| FE-ORG-01 | Toggle favorite on a project                   | Project moves into or out of the Favorites section.                          | Passing |
| FE-ORG-02 | Archive a project                              | Project is removed from the active list and shown in the Archived view.      | Passing |
| FE-ORG-03 | Unarchive a project from the Archived view     | Project returns to the active list.                                          | Passing |
| FE-ORG-04 | Open the Inbox project menu                    | No archive option is shown.                                                  | Passing |
| FE-ORG-05 | Reorder projects in the sidebar                | New order is shown; Inbox stays first.                                       | Passing |
| FE-ORG-06 | Favorite, archive, or reorder request fails    | Change is reverted and an error is shown.                                    | Passing |
| FE-ORG-07 | Toggle favorite repeatedly in quick succession | Final UI state matches the server; no conflicting requests are left pending. | Passing |

### 4.6 Favorite, Archive & Sort Order Frontend Integration Tests

| ID        | Test Case          | Expected Result                                                                       | Status  |
| --------- | ------------------ | ------------------------------------------------------------------------------------- | ------- |
| FE-ORG-08 | Toggle favorite    | Calls `PUT /api/projects/{projectId}/favorite` with only `isFavorite`.                | Passing |
| FE-ORG-09 | Archive or restore | Calls `PUT /api/projects/{projectId}/archive` with only `isArchived`.                 | Passing |
| FE-ORG-10 | Reorder a project  | Calls `PUT /api/projects/reorder` with every non-Inbox `projectIds` in the new order. | Passing |

Tests: the `Project Organization (switcher)` block in `frontend/tests/integration/features/projects/projects.integration.spec.ts`. They run through the real `/projects/organize` route (project switcher) with `ProjectOrganizationService`, `ProjectsStore`, the split-projects and reorder utils and the switcher's CDK drop lists; drags are sent through the drop list's real `cdkDropListDropped` handler. Response bodies follow `backend/src/features/projects/project-organization`.

- The switcher page stands in for the sidebar and project menu in FE-ORG-01 to FE-ORG-05: favorites, my projects and archived are separate sections, and the Inbox row has no favorite, archive or move controls.
- Favorite, archive and reorder are optimistic: the change shows before the server answers and is undone on a 400 or 500, with "Your change wasn't saved." and the reason (FE-ORG-06). Temporarily removing the rollback in `ProjectOrganizationService` makes exactly these tests fail.
- FE-ORG-07: the favorite button is disabled while its request runs, so a second click sends nothing.
- FE-ORG-10: the switcher sends one `PUT /api/projects/reorder` with every non-Inbox id (favorites, then my projects, then archived), not one `PUT /api/projects/{projectId}/sort-order` per project. Both routes exist on the backend; the switcher uses the bulk one, so the row now names it.
- Also covered: selecting a project switches the active project (`aria-current`, no request), every control is a named `<button>` with `aria-pressed` on the favorite toggle and move buttons as the keyboard alternative to dragging, and a 401 on favorite, archive or reorder clears the session and redirects to `/login`.

### 4.7 Favorite, Archive & Sort Order End-to-End

| ID        | Test Case                                                      | Expected Result                                        | Status  |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------ | ------- |
| FE-ORG-11 | Favorite, archive, restore, and reorder projects, then refresh | All changes persist after refresh in one browser flow. | Failing |

## 5. Project Deletion

### 5.1 Delete Project API

| ID        | Test Case                                              | Expected Result                                                                | Status  |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ | ------- |
| BE-DEL-01 | DELETE `/api/projects/{projectId}` for own project     | 204 No Content; `deleted_at` is set and the row remains.                       | Blocked |
| BE-DEL-02 | List and get a project after deleting it               | Project is not listed; GET returns 404.                                        | Blocked |
| BE-DEL-03 | Delete an archived project                             | 204 No Content; project is soft-deleted.                                       | Blocked |
| BE-DEL-04 | Delete the Inbox project                               | 403 Forbidden; deletion is rejected and the Inbox is unchanged.                | Blocked |
| BE-DEL-05 | Delete another user's or a nonexistent project         | 404 Not Found; no row is changed.                                              | Blocked |
| BE-DEL-06 | Delete a project that is already soft-deleted          | 404 Not Found.                                                                 | Blocked |
| BE-DEL-07 | DELETE `/api/projects/{projectId}` with no valid token | 401 Unauthorized.                                                              | Blocked |
| BE-DEL-08 | Delete a project that has tasks                        | Tasks are moved to the user's Inbox; `movedTaskCount` equals the number moved. | Blocked |
| BE-DEL-09 | Delete a project that has no tasks                     | `movedTaskCount` is 0.                                                         | Blocked |
| BE-DEL-10 | Moving tasks to the Inbox fails during delete          | Delete is rolled back; project and tasks are unchanged.                        | Blocked |

### 5.2 Deletion Backend Integration Tests

| ID        | Test Case                                           | Expected Result                                                                                 | Status  |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| BE-DEL-11 | Delete a project against the Supabase test database | `deleted_at` is set; the project stays in the database and other users' projects are unchanged. | Blocked |

### 5.3 Delete Project UI

| ID        | Test Case                                      | Expected Result                                                                                 | Status  |
| --------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| FE-DEL-01 | Choose Delete from a project menu              | Confirmation dialog names the project and says its tasks will move to Inbox.                    | Passing |
| FE-DEL-02 | Cancel the confirmation                        | Dialog closes; no API call is made.                                                             | Passing |
| FE-DEL-03 | Confirm deletion                               | Loading state shown; on success the project is removed and a notice shows the moved-task count. | Blocked |
| FE-DEL-04 | Delete the project that is currently open      | User is navigated to the Inbox.                                                                 | Failing |
| FE-DEL-05 | Open the Inbox project menu                    | No delete option is shown.                                                                      | Passing |
| FE-DEL-06 | Delete returns 400, 404, 500, or network error | Error is shown; on 404 the list is refreshed, otherwise the project remains.                    | Passing |

### 5.4 Deletion Frontend Integration Tests

| ID        | Test Case                  | Expected Result                                               | Status  |
| --------- | -------------------------- | ------------------------------------------------------------- | ------- |
| FE-DEL-07 | Confirm deletion           | Calls `DELETE /api/projects/{projectId}` once with the token. | Passing |
| FE-DEL-08 | Handle a successful delete | `movedTaskCount` from the response is shown in the notice.    | Failing |

- FE-DEL-03 is Blocked by Tasks: the backend answers `204 No Content` with no `movedTaskCount`, so the notice reads “Capstone” was deleted. without a count. Loading state and removal are tested and pass. Before this fix the null 204 body made the app report a failed delete after a successful one.
- FE-DEL-06 is checked for 404 (dialog closes, list reloads), 500 and network errors (dialog stays with the error, project kept). The delete API never returns 400.

### 5.5 Deletion End-to-End

| ID        | Test Case                                        | Expected Result                                     | Status  |
| --------- | ------------------------------------------------ | --------------------------------------------------- | ------- |
| FE-DEL-09 | Create a project, delete it, and refresh         | Project is gone after refresh; Inbox remains.       | Failing |
| FE-DEL-10 | Delete a project with tasks, then open the Inbox | The deleted project's tasks are shown in the Inbox. | Blocked |

- BE-DEL-08 to BE-DEL-10 and FE-DEL-10 are Blocked by Tasks. There is no task table or task API yet, so tasks cannot be moved to the Inbox or counted for `movedTaskCount`. They will be unblocked when the Tasks feature adds its table.

## 6. Landing Page

### 6.1 Landing Page Frontend Integration Tests

| ID        | Test Case                                                        | Expected Result                                                                                                 | Status  |
| --------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| FE-LND-01 | Open `/` as a guest                                              | Hero heading, four feature groups, four steps, closing card and footer are shown; page title is `HabitTracker`. | Passing |
| FE-LND-02 | Click Get Started, or Create free account in the hero or closing | User is taken to `/register`.                                                                                   | Passing |
| FE-LND-03 | Click Log in, or I already have an account                       | User is taken to `/login`.                                                                                      | Passing |
| FE-LND-04 | Click Features, How it works or About in the header              | Page scrolls to `#features`, `#how-it-works` or `#about`.                                                       | Passing |
| FE-LND-05 | Open `/` with a stored token that `GET /api/auth/me` accepts     | `guestGuard` redirects the user to `/home`.                                                                     | Passing |
| FE-LND-06 | Open `/` with a stored token that `GET /api/auth/me` rejects     | Landing page is shown.                                                                                          | Passing |
| FE-LND-07 | Check images and headings                                        | Every image has alt text or is `aria-hidden`; one `h1`, and heading levels never skip on the way down.          | Passing |

Tests: `frontend/tests/integration/features/landing/landing.integration.spec.ts`. The app runs with its real `appConfig` (the `''` route behind `guestGuard`, `SessionService`, the restore-session initializer and the router's anchor scrolling); only the network is faked.

- FE-LND-04 bootstraps the real root `App` component, because the router only starts anchor scrolling from the app's bootstrap listener. Turning `anchorScrolling` off in `app.config.ts` makes these tests fail; removing `guestGuard` from `''` makes FE-LND-05 fail.
- A guest opening `/` sends no request; there is no session to restore.
- Unit specs for the landing components are next to them: `landing.spec.ts`, `features/landing-features.spec.ts`, `steps/landing-steps.spec.ts`, `closing/landing-closing.spec.ts` and `footer/landing-footer.spec.ts`.
- Fixed while testing: the footer tagline showed "Get itdone". Angular removes whitespace-only text between tags, so the space between the two spans was lost; it now sits inside the first span.

## 7. Home Dashboard

### 7.1 Home Dashboard Frontend Integration Tests

| ID        | Test Case                                                       | Expected Result                                                                                                                           | Status  |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-HOM-01 | Visit `/home` while signed out                                  | User is redirected to `/login`.                                                                                                           | Passing |
| FE-HOM-02 | Open `/home` in the morning, afternoon and evening              | Greeting reads Good Morning, Good Afternoon or Good Evening with the username; the avatar shows its first letter.                         | Passing |
| FE-HOM-03 | Open `/home` with the sample data                               | Overdue note, Open tasks and Done today match the sample tasks.                                                                           | Passing |
| FE-HOM-04 | View the status columns                                         | Each open task is in Current, Upcoming or Overdue by due date; done tasks are checked in All Tasks.                                       | Passing |
| FE-HOM-05 | Click a project or priority in the sidebar, then click it again | Columns and All Tasks are filtered, then the filter clears; `aria-pressed` follows.                                                       | Passing |
| FE-HOM-06 | Add a task with + New Task                                      | Empty, spaces-only or over-120-character titles are blocked; a valid task lands in the right column and counts update.                    | Passing |
| FE-HOM-07 | Add, rename and delete a project in the sidebar                 | The project list updates; a deleted project's tasks stay without a project and its filter clears.                                         | Passing |
| FE-HOM-08 | Use the account menu                                            | Menu opens; Profile settings goes to `/settings/profile`; Log out sends `POST /api/auth/logout`, clears the session and goes to `/login`. | Passing |

Tests: `frontend/tests/integration/features/home/home.integration.spec.ts`. They run through the real `/home` route behind `authGuard` with the Home page, its board and sidebar components, `DashboardStore`, `SessionService` and `authInterceptor`; the user is signed in by restoring a token and answering `GET /api/auth/me`. Only the network and `Date` are faked (Friday 30 October 2026), because the sample tasks are dated relative to today.

- The dashboard still uses `DashboardStore`'s sample data, not `/api/projects` or a tasks API (its own TODO for Sprint 2). These rows check the page's behaviour, not persistence.
- FE-HOM-04: the board has Current, Upcoming and Overdue columns only. Done tasks are grouped as `done` in `DashboardStore` and shown checked at the end of All Tasks; there is no Done column.
- Fixed while testing: clicking the active project in the sidebar did not clear the filter (the priority list already toggled), and a task title of only spaces passed `required` and added a blank task. Both tests fail without the fixes.
- Unit specs: `dashboard.store.spec.ts`, `board/status-columns.spec.ts`, `board/all-tasks.spec.ts`, `sidebar/project-list.spec.ts`, `sidebar/priority-list.spec.ts` and `sidebar/mini-calendar.spec.ts`.

## Open Questions

- The current backend differs from API Specification v1.1 for Project CRUD: create returns 201 rather than 200, updates use PATCH rather than PUT, and the archived-list filter is named `isArchived` rather than `archived`. This matrix and the integration tests follow the current backend contract; align the API spec and implementation in a separate decision.
- The 404 sample for Update Project (II.D) is `{"error": "Invalid updating project."}`, while every other endpoint uses `{"error": "Project not found"}`. BE-EDT-07 checks only the status code until the message is confirmed.
- The spec does not say whether the Inbox can be renamed, recolored, favorited, or reordered. Only archive and delete are explicitly blocked. Cases for those will be added once the team decides.
- The spec does not say whether project names must be unique per user. No duplicate-name case is included.

## Summary

| Deliverable                    | Backend Cases | Frontend Cases | Total   | Failing | Passing | Blocked |
| ------------------------------ | ------------- | -------------- | ------- | ------- | ------- | ------- |
| Project Listing & Retrieval    | 19            | 15             | 34      | 6       | 9       | 19      |
| Project Creation               | 13            | 13             | 26      | 6       | 11      | 9       |
| Project Editing                | 23            | 16             | 39      | 26      | 9       | 4       |
| Favorite, Archive & Sort Order | 23            | 11             | 34      | 17      | 10      | 7       |
| Project Deletion               | 11            | 10             | 21      | 3       | 5       | 13      |
| Landing Page                   | 0             | 7              | 7       | 0       | 7       | 0       |
| Home Dashboard                 | 0             | 8              | 8       | 0       | 8       | 0       |
| **Total**                      | **89**        | **80**         | **169** | **58**  | **59**  | **52**  |
