# Board Buddy

Build a frontend-only mini kanban board app: React + TypeScript + Tailwind + shadcn/ui. No real backend, network calls, or persistence in this pass — everything resets on page reload.

## Mock layer
Create a single module, `src/api/mockClient.ts`, as the ONLY place that knows about backend operations. Every board/column/task/sharing action is one async function there: `listBoards()`, `createBoard()`, `renameBoard()`, `deleteBoard()`, `transferOwnership()`, `createColumn()`, `renameColumn()`, `deleteColumn()`, `createTask()`, `updateTask()`, `moveTask()`, `archiveTask()`, `unarchiveTask()` (out of scope for UI but keep data model clean), `deleteTaskPermanently()`, `archiveAllInDone()`, `listArchivedTasks()`, `createShareLink()`, `revokeShareLink()`, `redeemShareLink()`, `listMembers()`, `updateMemberRole()`, `removeMember()`. No component reads/writes mock state directly — everything goes through these functions, which return plain data (not references into the store), so a real HTTP client could later replace this file's internals with no UI changes.

The store is in-memory only (resets on reload, no localStorage). Functions must validate the caller's role themselves and reject disallowed actions the way a real API would (throw/return an error), not just rely on the UI hiding buttons.

Data shapes are frontend DTOs (never include backend-only fields like passwordHash).

## Data model (mirror specs.md, minus backend-only fields)
- User: { id, email, name }
- Board: { id, name, createdAt }
- BoardMember: { boardId, userId, role: "owner"|"editor"|"viewer" } — exactly one owner per board
- ShareLink: { id, boardId, role: "editor"|"viewer", token, createdBy, revoked }
- Column: { id, boardId, name, order } — order unique within board
- Task: { id, boardId, columnId, title, description, dueDate, priority: "Low"|"Medium"|"High" (default Medium), order, archived (default false), createdAt, createdBy }

Task/column order uses midpoint-insert with round-number re-spacing (0, 1000, 2000...) when neighbors are too close to split — implement this once in the mock client for both task and column ordering, since it'll be reused when a real backend replaces this file.

Deleting a non-Done column with tasks archives those tasks; an archived task keeps the columnId of the column it was deleted from for display/history but never reappears on the board.

## Seed data
- One hardcoded "current user" Alice, no real sign-up/sign-in gating (auth screens exist as static UI but always proceed to this same user).
- Alice owns two boards, "Personal" and "Work", each with the four default columns (Backlog, Today, Doing, Done) and several sample cards spread across columns, including at least one overdue card and one archived card.
- At least one additional board owned by a different fixture user, with Alice already a member (e.g. editor) and one other fixture member — needed to demo the member list, role changes, and the share-link "upgrade never downgrades" rule.
- At least one seeded, valid share-link token for a board Alice is NOT yet a member of, so link redemption can be demoed end-to-end.

## Screens & components
- Auth screens: static sign-up/sign-in forms; submitting either always proceeds to the same mock user.
- Board switcher: lists every board the current user is a member of (owned or shared), plus "+ New board".
- Board view: columns left-to-right in order; "+ New column" appends a column to the end. Done column shows "Archive all in Done". Cards show title, priority indicator, due date if set, with overdue visual treatment. "+ Add card" on each column creates a task (title required, defaults: priority Medium, archived false, appended to end of column).
- Card editor (modal/drawer on card click): edit title, description, due date, priority. Viewers can open read-only with no save action.
- Column controls: non-Done columns renameable inline and deletable; deleting a column with tasks requires confirmation before archiving its tasks. Done column has no rename/delete controls and its name is protected — no other column can be named "Done".
- Archive view (per board): lists archived tasks; owners/editors can permanently delete a task from here (irreversible, no restore). Viewers can view but not delete.
- Board settings (owner only): rename/delete board (delete requires confirmation and explains the cascade), member list with per-member role change and remove, share-link list (create view/edit links, revoke independently), ownership transfer to another existing member.
- Share-link redemption route (/share/:token): looks up the mock token; on success adds/upgrades the current user's membership on that board per the redemption rule (never downgrades), then navigates to the board; invalid/revoked token shows an error state.
- Dev role switcher: always-visible control ("Viewing as: Owner / Editor / Viewer") that overrides the effective role used for permission checks on the CURRENT board only, purely to demo role-gated UI — it never mutates underlying BoardMember rows.

## Interactions
- Drag and drop: cards draggable between/within columns for Owner/Editor simulated role; static/non-draggable for Viewer. Dropping sets columnId and recomputes order via the mock client's midpoint/re-spacing scheme.
- Overdue: a card is overdue when today's date is after its dueDate (date-only comparison), not archived, and not in the Done column.
- Archiving: per-card archive action, plus bulk "Archive all in Done".
- Sharing: generate view/edit share link from board settings; revoke any link independently; redeeming a link creates/upgrades membership (never downgrades); removing a member also revokes all of that board's currently active links.
- Ownership transfer: promotes chosen member to owner, demotes current owner to editor; owner cannot remove their own access or leave without transferring or deleting first.
- Permissions: Viewer is read-only everywhere (no create/edit/move/archive/delete, no drag, no board settings access). Editor can do all board content actions but not manage members/links/deletion/ownership transfer. Owner can do everything.

## Out of scope for this pass
No real backend/network/persistence beyond in-memory mock state. No real authentication. No column reordering, no real-time sync, no restoring archived tasks back to the board.

Make the whole UI fully interactive so all of the above can actually be used right now, not just visually mocked up.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3e81aa81-f311-4f15-b5c8-356f72722174).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
