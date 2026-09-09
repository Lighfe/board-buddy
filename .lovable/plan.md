# Restore archived cards

Add a "Restore" action to the Archive view so an archived card can be put back on the board.

## Behaviour

- Restore puts the card back at the bottom of the column it was archived from.
- If that column has since been deleted, the card goes to the bottom of Backlog instead. If the board has no Backlog column either, the action fails with a clear message.
- Owners and editors can restore (same level as archiving). Viewers cannot, and the rule is enforced in the mock API, not just by hiding the button.
- After a successful restore, the card disappears from the Archive list and shows up on the board.
- The Restore button sits next to the owner-only Delete button and does not open the read-only card dialog when clicked.

## Technical notes

`src/api/mockClient.ts`
- New `restoreTask(boardId, taskId)`:
  - `require(boardId, "editor")`; task must exist on the board and be archived (409 otherwise).
  - Target column = stored `columnId` if it still exists on the board, else the board's column named "Backlog" (case-insensitive); if neither exists, throw `ApiError("No column available to restore into", 409)`.
  - Set `archived = false`, `columnId = target.id`, and `order = orderForIndex(siblings, siblings.length)` over the target column's non-archived tasks — same midpoint/re-spacing helper used elsewhere.
  - Returns the refreshed archived list, same shape as `listArchivedTasks` (`Array<Task & { columnName: string }>`), so the archive screen refreshes from one call.
- Existing `unarchiveTask` stays as-is (data-model completeness); `restoreTask` is the UI-facing entry point with the Backlog fallback.

`src/routes/boards.$boardId.archive.tsx`
- `canRestore = board?.role === "owner" || board?.role === "editor"`.
- Render a `Restore` button (ghost, `ArchiveRestore` icon from lucide-react, `aria-label="Restore card"`) before the delete button, wrapped with `onClick={(e) => e.stopPropagation()}` like the delete trigger, calling `mutate(() => restoreTask(boardId, t.id), "Card restored")`.
- The existing `useApi`/revision refresh already re-reads the archive list after a mutation, so the row drops off automatically.
- Update the intro copy to mention restoring.
