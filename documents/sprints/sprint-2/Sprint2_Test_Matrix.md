# Sprint 2 Test Matrix

Last Updated: October 21, 2026

## Overview

Combined backend and frontend test cases for Sprint 2 (Projects), based on API Specification v1.1, Section II (`/api/projects`): Project Listing & Retrieval, Project Creation, Project Editing, Favorite / Archive / Sort Order, and Project Deletion. Test IDs keep the Sprint 1 convention: `BE` for backend and `FE` for frontend.

Every `/api/projects` endpoint requires `Authorization: Bearer <token>` from `/api/auth/login` and only returns data owned by the authenticated user. Projects are stored in `tbl_project`. Deletion is soft (`deleted_at` is set), and soft-deleted projects are treated as not found.

Frontend integration tests use the app's real routes, services, and `HttpClient`; only network requests are faked with `HttpTestingController`. Run with `npm test` from `frontend`.

Backend integration tests belong in `backend/src/testing/integration` and run with `npm run test:integration` from `backend`, against the isolated Supabase test project described in the Sprint 1 matrix (`SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, `SUPABASE_TEST_DATABASE_URL`).

Project CRUD integration tests use the production app and its real authenticated router. They follow the current backend contract: create returns 201, updates use PATCH, and list filtering uses `isArchived`. The API specification describes different values (200, PUT, and `archived`); reconcile the spec and implementation separately. The current list API has no pagination parameters.

Frontend routes for projects do not exist yet. This matrix assumes `/projects/:projectId` for a single project view; update the routes here once they are implemented.

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
| FE-LST-01 | Open the app while logged in                 | Sidebar shows Inbox first, then projects in `sortOrder` with name and color.   | Failing |
| FE-LST-02 | View the Inbox entry                         | Inbox is visually distinct and has no archive or delete actions.               | Failing |
| FE-LST-03 | View favorite projects                       | Favorite projects appear in a Favorites section.                               | Failing |
| FE-LST-04 | View archived projects                       | Archived projects are hidden from the main list and shown in an Archived view. | Failing |
| FE-LST-05 | User has only the Inbox                      | Empty state invites the user to create a project.                              | Failing |
| FE-LST-06 | Load the project list                        | Loading state is shown until the list request finishes.                        | Failing |
| FE-LST-07 | List request returns 500 or a network error  | Error is shown with a retry action.                                            | Failing |
| FE-LST-08 | Click a project in the list                  | Navigates to `/projects/:projectId` showing name, description, and color.      | Failing |
| FE-LST-09 | Open `/projects/:projectId` that returns 404 | "Project not found" message with a link back to Inbox.                         | Failing |
| FE-LST-10 | Visit a project route while unauthenticated  | User is redirected to `/login`.                                                | Failing |

### 1.5 Listing & Retrieval Frontend Integration Tests

| ID        | Test Case                   | Expected Result                                                       | Status  |
| --------- | --------------------------- | --------------------------------------------------------------------- | ------- |
| FE-LST-11 | Load the project list       | Calls `GET /api/projects` with the token in the Authorization header. | Failing |
| FE-LST-12 | Open the Archived view      | Calls `GET /api/projects?archived=true`.                              | Failing |
| FE-LST-13 | Open a project              | Calls `GET /api/projects/{projectId}` with the route's ID.            | Failing |
| FE-LST-14 | Project request returns 401 | Session is cleared; user is redirected to `/login`.                   | Failing |

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
| FE-CRT-01 | Open the "Add project" dialog                     | Name, description, color picker, and submit button are shown.                | Failing |
| FE-CRT-02 | Submit with an empty name                         | Required-field error is shown; no API call is made.                          | Failing |
| FE-CRT-03 | Enter name over 150 or description over 500 chars | Inline maximum-length error is shown; submit is blocked.                     | Failing |
| FE-CRT-04 | Choose a color                                    | Only valid hex colors can be selected.                                       | Failing |
| FE-CRT-05 | Submit the create form                            | Button is disabled and loading state shown; duplicate submits are prevented. | Failing |
| FE-CRT-06 | Create succeeds                                   | Dialog closes; new project appears in the sidebar without a reload.          | Failing |
| FE-CRT-07 | Create returns 400                                | Server error message is shown; form values are preserved.                    | Failing |
| FE-CRT-08 | Create returns 500 or a network error             | Generic error is shown; user can retry.                                      | Failing |
| FE-CRT-09 | Cancel the dialog                                 | Dialog closes; no API call is made.                                          | Failing |
| FE-CRT-10 | Use the dialog with a keyboard                    | Fields have labels and logical tab order; Enter submits; Escape closes.      | Failing |

### 2.4 Creation Frontend Integration Tests

| ID        | Test Case                         | Expected Result                                                                                                       | Status  |
| --------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-CRT-11 | Submit a valid project            | Calls `POST /api/projects` with `name`, `description`, `color`; never sends `isInbox`, `isFavorite`, or `isArchived`. | Failing |
| FE-CRT-12 | Submit with optional fields empty | `description` and `color` are sent as null or omitted, never as empty strings.                                        | Failing |

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
| FE-EDT-01 | Open the Edit Project form                  | Name, description, and color are pre-filled with current values.              | Failing |
| FE-EDT-02 | Clear the name and submit                   | Required-field error is shown; no API call is made.                           | Failing |
| FE-EDT-03 | Enter name over 150 or description over 500 | Inline maximum-length error is shown; submit is blocked.                      | Failing |
| FE-EDT-04 | Open the form without changing fields       | Save is enabled only when the form is dirty.                                  | Failing |
| FE-EDT-05 | Submit the edit form                        | Button is disabled and loading state shown; duplicate submits are prevented.  | Failing |
| FE-EDT-06 | Save valid changes                          | Success message is shown; sidebar and project header update without a reload. | Failing |
| FE-EDT-07 | Save returns 400                            | Error is shown on the relevant field; edits are preserved.                    | Failing |
| FE-EDT-08 | Save returns 404                            | "Project not found" is shown; project list is refreshed.                      | Failing |
| FE-EDT-09 | Save returns 500 or a network error         | Generic error is shown; edits are preserved.                                  | Failing |
| FE-EDT-10 | Rename a project inline from the sidebar    | Enter saves the new name; Escape cancels and restores the old name.           | Failing |
| FE-EDT-11 | Change color from the project menu          | Project color chip updates in the sidebar.                                    | Failing |

### 3.7 Editing Frontend Integration Tests

| ID        | Test Case                  | Expected Result                                                                       | Status  |
| --------- | -------------------------- | ------------------------------------------------------------------------------------- | ------- |
| FE-EDT-12 | Save the Edit Project form | Calls `PUT /api/projects/{projectId}` with only changed `name`/`description`/`color`. | Failing |
| FE-EDT-13 | Rename inline              | Calls `PUT /api/projects/{projectId}/name` with only `name`.                          | Failing |
| FE-EDT-14 | Clear the description      | Calls `PUT /api/projects/{projectId}/description` with `description: null`.           | Failing |
| FE-EDT-15 | Remove the color           | Calls `PUT /api/projects/{projectId}/color` with `color: null`.                       | Failing |

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
| FE-ORG-01 | Toggle favorite on a project                   | Project moves into or out of the Favorites section.                          | Failing |
| FE-ORG-02 | Archive a project                              | Project is removed from the active list and shown in the Archived view.      | Failing |
| FE-ORG-03 | Unarchive a project from the Archived view     | Project returns to the active list.                                          | Failing |
| FE-ORG-04 | Open the Inbox project menu                    | No archive option is shown.                                                  | Failing |
| FE-ORG-05 | Reorder projects in the sidebar                | New order is shown; Inbox stays first.                                       | Failing |
| FE-ORG-06 | Favorite, archive, or reorder request fails    | Change is reverted and an error is shown.                                    | Failing |
| FE-ORG-07 | Toggle favorite repeatedly in quick succession | Final UI state matches the server; no conflicting requests are left pending. | Failing |

### 4.6 Favorite, Archive & Sort Order Frontend Integration Tests

| ID        | Test Case          | Expected Result                                                         | Status  |
| --------- | ------------------ | ----------------------------------------------------------------------- | ------- |
| FE-ORG-08 | Toggle favorite    | Calls `PUT /api/projects/{projectId}/favorite` with only `isFavorite`.  | Failing |
| FE-ORG-09 | Archive or restore | Calls `PUT /api/projects/{projectId}/archive` with only `isArchived`.   | Failing |
| FE-ORG-10 | Reorder a project  | Calls `PUT /api/projects/{projectId}/sort-order` with only `sortOrder`. | Failing |

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
| FE-DEL-01 | Choose Delete from a project menu              | Confirmation dialog names the project and says its tasks will move to Inbox.                    | Failing |
| FE-DEL-02 | Cancel the confirmation                        | Dialog closes; no API call is made.                                                             | Failing |
| FE-DEL-03 | Confirm deletion                               | Loading state shown; on success the project is removed and a notice shows the moved-task count. | Failing |
| FE-DEL-04 | Delete the project that is currently open      | User is navigated to the Inbox.                                                                 | Failing |
| FE-DEL-05 | Open the Inbox project menu                    | No delete option is shown.                                                                      | Failing |
| FE-DEL-06 | Delete returns 400, 404, 500, or network error | Error is shown; on 404 the list is refreshed, otherwise the project remains.                    | Failing |

### 5.4 Deletion Frontend Integration Tests

| ID        | Test Case                  | Expected Result                                               | Status  |
| --------- | -------------------------- | ------------------------------------------------------------- | ------- |
| FE-DEL-07 | Confirm deletion           | Calls `DELETE /api/projects/{projectId}` once with the token. | Failing |
| FE-DEL-08 | Handle a successful delete | `movedTaskCount` from the response is shown in the notice.    | Failing |

### 5.5 Deletion End-to-End

| ID        | Test Case                                        | Expected Result                                     | Status  |
| --------- | ------------------------------------------------ | --------------------------------------------------- | ------- |
| FE-DEL-09 | Create a project, delete it, and refresh         | Project is gone after refresh; Inbox remains.       | Failing |
| FE-DEL-10 | Delete a project with tasks, then open the Inbox | The deleted project's tasks are shown in the Inbox. | Blocked |

- BE-DEL-08 to BE-DEL-10 and FE-DEL-10 are Blocked by Tasks. There is no task table or task API yet, so tasks cannot be moved to the Inbox or counted for `movedTaskCount`. They will be unblocked when the Tasks feature adds its table.

## Open Questions

- The current backend differs from API Specification v1.1 for Project CRUD: create returns 201 rather than 200, updates use PATCH rather than PUT, and the archived-list filter is named `isArchived` rather than `archived`. This matrix and the integration tests follow the current backend contract; align the API spec and implementation in a separate decision.
- The 404 sample for Update Project (II.D) is `{"error": "Invalid updating project."}`, while every other endpoint uses `{"error": "Project not found"}`. BE-EDT-07 checks only the status code until the message is confirmed.
- The spec does not say whether the Inbox can be renamed, recolored, favorited, or reordered. Only archive and delete are explicitly blocked. Cases for those will be added once the team decides.
- The spec does not say whether project names must be unique per user. No duplicate-name case is included.

## Summary

| Deliverable                    | Backend Cases | Frontend Cases | Total   | Failing | Passing | Blocked |
| ------------------------------ | ------------- | -------------- | ------- | ------- | ------- | ------- |
| Project Listing & Retrieval    | 19            | 15             | 34      | 15      | 0       | 19      |
| Project Creation               | 13            | 13             | 26      | 17      | 0       | 9       |
| Project Editing                | 23            | 16             | 39      | 35      | 0       | 4       |
| Favorite, Archive & Sort Order | 23            | 11             | 34      | 27      | 0       | 7       |
| Project Deletion               | 11            | 10             | 21      | 9       | 0       | 12      |
| **Total**                      | **89**        | **65**         | **154** | **103** | **0**   | **51**  |
