# Fixes from end-to-end testing

Four independent changes. Items 1-3 are cleanup/usability and can ship together; item 4 is a new feature.

## 1. Remove the leftover demo invite card

Delete the "Try an invite link" section at the bottom of the board list (the one mentioning Dave's Marketing Launch board and the `/share/DEMO-EDIT-TOKEN` link). Nothing else on that page changes; real invite links are still created and copied from board settings.

## 2. Columns reserve room for three cards

Give every column a minimum height equal to roughly three card slots, so an empty or half-filled column already looks like a place to drop things instead of a thin strip. Once a column holds more than three cards it keeps growing naturally, one card's worth of height at a time, exactly as it does today. The empty-state text stays, centred in that reserved space.

## 3. The whole column accepts a dropped card

Today only a thin strip near the cursor accepts a drop, so a card that lands a few pixels off silently snaps back. Change it so the entire column body is a drop target: dragging anywhere over a column highlights it, and releasing there always places the card. The exact position within the column is still decided by the gaps between cards when the cursor is over them; a drop on empty space below the last card appends to the end of that column.

## 4. Custom background colour per board

Add a colour picker in board settings (owner only, next to the board name) offering a small palette of preset backgrounds plus a "default" option. The chosen colour tints the board's background behind the columns, and shows as a small colour dot next to that board on the board list.

Important limitation to confirm: the server's board record has no colour field, so the choice is stored in the browser and applies only on the device that set it — other members, and the same user on another device, still see the default. Making it shared would need a backend change (a `color` field on the board plus support in the board update endpoint). Say the word and this item can wait for that instead.

## Technical notes

- `src/routes/boards.index.tsx`: remove the trailing demo `<section>` (and the now-unused import if any).
- `src/components/kanban/ColumnView.tsx`: add `min-h-[…]` on the card container sized to ~3 cards; move `onDragOver`/`onDrop` handlers up to the column body so it is the drop surface, keep the per-index gap zones purely for choosing the insert index, and default to appending when the drop lands outside a gap. Highlight the column while a card is dragged over it.
- Board colour: a `boardColor` helper (localStorage, key per board id) plus a small preset list of CSS values driven from existing theme tokens; applied as a wrapper class/style in `src/routes/boards.$boardId.tsx`, picker section in `boards.$boardId.settings.tsx`, dot in `boards.index.tsx`. No change to `src/api/mockClient.ts`.
