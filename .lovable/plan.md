# Three kanban changes

## 1. Only owners can delete archived cards forever

- Mock layer: `deleteTaskPermanently` currently requires "editor". Raise it to "owner", so an editor or viewer attempting the call gets a permission error, not just a hidden button.
- Archive page: show the delete button only when the effective role is owner. Editors and viewers see the list without it.
- Archiving a card from the board and "Archive all in Done" stay available to editors — unchanged.

## 2. Open an archived card to read its details

- Clicking an archived item opens the same card editor used on the board, in read-only mode (title, description, due date, priority all disabled; only a Close action, no save, no archive button).
- Reuse `TaskEditorDialog` with `canEdit={false}`; the existing read-only branch already hides Save/Archive. Its description line mentions view-only access — adjust the wording so an archived card explains "this card is archived and can't be edited" instead of implying a role limit.
- The dialog gets the archived card's stored column name (already returned by `listArchivedTasks`).
- The delete button (owners) must not trigger the dialog — stop click propagation on it.

## 3. Drag columns to reorder

- New mock function `reorderColumn(boardId, columnId, index)`:
  - requires "editor";
  - rejects moving the Done column;
  - clamps the target so a column can never land after Done;
  - computes the new `order` with the existing `orderForIndex` midpoint + 1000-spacing helper, same as tasks.
- Board view: column headers become drag handles for owner/editor. Drop targets sit between columns, and no drop target is offered to the right of Done, so Done stays the rightmost column.
- Viewers cannot drag columns.
- Column dragging and card dragging are tracked separately so dropping a card into a column still works and the two don't interfere.

## Technical notes

Files touched:
- `src/api/mockClient.ts` — role change on `deleteTaskPermanently`, new `reorderColumn` using `orderForIndex` with a Done-aware clamp (Done's index computed from the board's sorted columns).
- `src/routes/boards.$boardId.archive.tsx` — owner-only delete, click-to-open read-only dialog, local state for the selected archived task.
- `src/components/kanban/TaskEditorDialog.tsx` — optional `archived` flag for the read-only description text.
- `src/components/kanban/ColumnView.tsx` — draggable header, column drop-zone rendering, new props for column drag state.
- `src/routes/boards.$boardId.index.tsx` — column drag state, drop handler calling `reorderColumn` through `useMutate`.

Drag-and-drop stays on native HTML5 events, consistent with the current card implementation.
