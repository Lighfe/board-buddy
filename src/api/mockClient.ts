/**
 * mockClient.ts
 *
 * The ONLY module that knows about "backend" operations.
 * Everything is in-memory (resets on reload). Every exported function is async,
 * validates the caller's role like a real API would, and returns plain cloned
 * data (never references into the store) so this file's internals can later be
 * swapped for a real HTTP client with zero UI changes.
 */

/* ---------------------------------- DTOs --------------------------------- */

export type Role = "owner" | "editor" | "viewer";
export type ShareRole = "editor" | "viewer";
export type Priority = "Low" | "Medium" | "High";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Board {
  id: string;
  name: string;
  createdAt: string;
}

export interface BoardMember {
  boardId: string;
  userId: string;
  role: Role;
}

/** Member row enriched with the user profile, for member lists. */
export interface BoardMemberDetail extends BoardMember {
  user: User;
}

export interface ShareLink {
  id: string;
  boardId: string;
  role: ShareRole;
  token: string;
  createdBy: string;
  revoked: boolean;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  order: number;
  archived: boolean;
  createdAt: string;
  createdBy: string;
}

export interface BoardSummary extends Board {
  role: Role;
  ownerName: string;
}

export interface BoardContents {
  board: Board;
  role: Role;
  columns: Column[];
  tasks: Task[];
}

/* --------------------------------- Store --------------------------------- */

interface Store {
  users: User[];
  boards: Board[];
  members: BoardMember[];
  links: ShareLink[];
  columns: Column[];
  tasks: Task[];
}

const SPACING = 1000;
const MIN_GAP = 1;
const LATENCY = 120;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const wait = () => new Promise<void>((r) => setTimeout(r, LATENCY));

let seq = 0;
const id = (prefix: string) => `${prefix}_${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function dayOffset(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ------------------------------- Seed data -------------------------------- */

const alice: User = { id: "u_alice", email: "alice@example.com", name: "Alice Nguyen" };
const bob: User = { id: "u_bob", email: "bob@example.com", name: "Bob Ferrara" };
const carol: User = { id: "u_carol", email: "carol@example.com", name: "Carol Mensah" };
const dave: User = { id: "u_dave", email: "dave@example.com", name: "Dave Okafor" };

const DEFAULT_COLUMNS = ["Backlog", "Today", "Doing", "Done"];

function buildStore(): Store {
  const store: Store = { users: [alice, bob, carol, dave], boards: [], members: [], links: [], columns: [], tasks: [] };

  const addBoard = (name: string, ownerId: string) => {
    const board: Board = { id: id("b"), name, createdAt: new Date().toISOString() };
    store.boards.push(board);
    store.members.push({ boardId: board.id, userId: ownerId, role: "owner" });
    DEFAULT_COLUMNS.forEach((cn, i) => {
      store.columns.push({ id: id("c"), boardId: board.id, name: cn, order: i * SPACING });
    });
    return board;
  };

  const col = (boardId: string, name: string) =>
    store.columns.find((c) => c.boardId === boardId && c.name === name)!;

  const addTask = (
    boardId: string,
    columnName: string,
    title: string,
    opts: Partial<Pick<Task, "description" | "dueDate" | "priority" | "archived">> = {},
    createdBy = alice.id,
  ) => {
    const columnId = col(boardId, columnName).id;
    const siblings = store.tasks.filter((t) => t.columnId === columnId);
    store.tasks.push({
      id: id("t"),
      boardId,
      columnId,
      title,
      description: opts.description ?? "",
      dueDate: opts.dueDate ?? null,
      priority: opts.priority ?? "Medium",
      order: siblings.length * SPACING,
      archived: opts.archived ?? false,
      createdAt: new Date().toISOString(),
      createdBy,
    });
  };

  /* Personal — owned by Alice */
  const personal = addBoard("Personal", alice.id);
  addTask(personal.id, "Backlog", "Plan autumn hiking trip", { priority: "Low", dueDate: dayOffset(21) });
  addTask(personal.id, "Backlog", "Replace bike brake pads", { description: "Shop on 5th street has the right size." });
  addTask(personal.id, "Today", "Renew passport", { priority: "High", dueDate: dayOffset(-3), description: "Appointment slots fill fast." });
  addTask(personal.id, "Today", "Call the dentist", { dueDate: dayOffset(0) });
  addTask(personal.id, "Doing", "Read 'The Nature Fix'", { priority: "Low" });
  addTask(personal.id, "Done", "Pay electricity bill", { dueDate: dayOffset(-6) });
  addTask(personal.id, "Done", "Water the plants", { priority: "Low", archived: true });

  /* Work — owned by Alice */
  const work = addBoard("Work", alice.id);
  addTask(work.id, "Backlog", "Draft Q4 roadmap", { priority: "High", dueDate: dayOffset(12) });
  addTask(work.id, "Backlog", "Clean up analytics events", { priority: "Low" });
  addTask(work.id, "Today", "Review onboarding copy", { dueDate: dayOffset(-1), priority: "High", description: "Legal flagged two lines." });
  addTask(work.id, "Today", "1:1 with Bob", { dueDate: dayOffset(0) });
  addTask(work.id, "Doing", "Ship billing hotfix", { priority: "High", dueDate: dayOffset(2) });
  addTask(work.id, "Doing", "Update API docs", {});
  addTask(work.id, "Done", "Archive old design files", { priority: "Low" });
  addTask(work.id, "Done", "Close sprint 41", { archived: true });

  /* Design System — owned by Bob, Alice is editor, Carol is viewer */
  const design = addBoard("Design System", bob.id);
  store.members.push({ boardId: design.id, userId: alice.id, role: "editor" });
  store.members.push({ boardId: design.id, userId: carol.id, role: "viewer" });
  addTask(design.id, "Backlog", "Audit icon set", { priority: "Low" }, bob.id);
  addTask(design.id, "Today", "Token naming proposal", { dueDate: dayOffset(-2), priority: "High" }, bob.id);
  addTask(design.id, "Doing", "Rewrite Button variants", { dueDate: dayOffset(4) }, alice.id);
  addTask(design.id, "Done", "Kickoff workshop", {}, bob.id);

  /* Marketing — owned by Dave, Alice NOT a member; seeded editor share link */
  const marketing = addBoard("Marketing Launch", dave.id);
  store.members.push({ boardId: marketing.id, userId: carol.id, role: "viewer" });
  addTask(marketing.id, "Backlog", "Landing page copy", { priority: "High", dueDate: dayOffset(9) }, dave.id);
  addTask(marketing.id, "Today", "Press list follow-up", { dueDate: dayOffset(-4) }, dave.id);
  addTask(marketing.id, "Doing", "Launch video edit", {}, dave.id);
  store.links.push({
    id: id("sl"),
    boardId: marketing.id,
    role: "editor",
    token: "DEMO-EDIT-TOKEN",
    createdBy: dave.id,
    revoked: false,
  });

  return store;
}

const db = buildStore();

/* ------------------------- Session / dev role shim ------------------------ */

const CURRENT_USER_ID = alice.id;

/**
 * Dev-only shim backing the "Viewing as" switcher. It overrides the effective
 * role used for permission checks on one board; it never mutates member rows.
 */
const simulatedRoles = new Map<string, Role>();

export function setSimulatedRole(boardId: string, role: Role | null): void {
  if (role) simulatedRoles.set(boardId, role);
  else simulatedRoles.delete(boardId);
}

export function getSimulatedRole(boardId: string): Role | null {
  return simulatedRoles.get(boardId) ?? null;
}

export async function getCurrentUser(): Promise<User> {
  await wait();
  return clone(alice);
}

/* ------------------------------- Internals -------------------------------- */

const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

function boardOrThrow(boardId: string): Board {
  const b = db.boards.find((x) => x.id === boardId);
  if (!b) throw new ApiError("Board not found", 404);
  return b;
}

function realRole(boardId: string): Role | null {
  return db.members.find((m) => m.boardId === boardId && m.userId === CURRENT_USER_ID)?.role ?? null;
}

/** Effective role = real membership, narrowed/overridden by the dev switcher. */
function effectiveRole(boardId: string): Role {
  const actual = realRole(boardId);
  if (!actual) throw new ApiError("You do not have access to this board", 403);
  return simulatedRoles.get(boardId) ?? actual;
}

function require(boardId: string, min: Role): Role {
  boardOrThrow(boardId);
  const role = effectiveRole(boardId);
  if (RANK[role] < RANK[min]) {
    throw new ApiError(
      min === "owner"
        ? "Only the board owner can do that"
        : "You have view-only access to this board",
      403,
    );
  }
  return role;
}

function isDone(column: Column): boolean {
  return column.name.trim().toLowerCase() === "done";
}

function assertNotDoneName(name: string) {
  if (name.trim().toLowerCase() === "done") {
    throw new ApiError('"Done" is a protected column name', 400);
  }
}

/* ----------------------- Shared ordering (midpoint) ----------------------- */

/**
 * Midpoint insert with round-number re-spacing. `siblings` must be the ordered
 * list the item is being inserted into, WITHOUT the item itself.
 * Returns the order value for the new position (re-spacing siblings in place
 * when neighbours are too close to split).
 */
function orderForIndex<T extends { order: number }>(siblings: T[], index: number): number {
  const sorted = [...siblings].sort((a, b) => a.order - b.order);
  const at = Math.max(0, Math.min(index, sorted.length));
  const prev = sorted[at - 1];
  const next = sorted[at];

  if (!prev && !next) return 0;
  if (!prev) return next!.order - SPACING;
  if (!next) return prev.order + SPACING;
  if (next.order - prev.order > MIN_GAP) return (prev.order + next.order) / 2;

  // Too tight to split: re-space everything on round numbers and retry.
  sorted.forEach((item, i) => {
    item.order = i * SPACING;
  });
  return ((at - 1) * SPACING + at * SPACING) / 2;
}

/* --------------------------------- Boards -------------------------------- */

export async function listBoards(): Promise<BoardSummary[]> {
  await wait();
  const mine = db.members.filter((m) => m.userId === CURRENT_USER_ID);
  return mine
    .map((m) => {
      const board = db.boards.find((b) => b.id === m.boardId)!;
      const ownerId = db.members.find((x) => x.boardId === m.boardId && x.role === "owner")!.userId;
      const owner = db.users.find((u) => u.id === ownerId)!;
      return { ...clone(board), role: m.role, ownerName: owner.name };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBoard(boardId: string): Promise<BoardContents> {
  await wait();
  const board = boardOrThrow(boardId);
  const role = effectiveRole(boardId);
  return {
    board: clone(board),
    role,
    columns: clone(db.columns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order)),
    tasks: clone(db.tasks.filter((t) => t.boardId === boardId).sort((a, b) => a.order - b.order)),
  };
}

export async function createBoard(name: string): Promise<Board> {
  await wait();
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError("Board name is required");
  const board: Board = { id: id("b"), name: trimmed, createdAt: new Date().toISOString() };
  db.boards.push(board);
  db.members.push({ boardId: board.id, userId: CURRENT_USER_ID, role: "owner" });
  DEFAULT_COLUMNS.forEach((cn, i) =>
    db.columns.push({ id: id("c"), boardId: board.id, name: cn, order: i * SPACING }),
  );
  return clone(board);
}

export async function renameBoard(boardId: string, name: string): Promise<Board> {
  await wait();
  require(boardId, "owner");
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError("Board name is required");
  const board = boardOrThrow(boardId);
  board.name = trimmed;
  return clone(board);
}

export async function deleteBoard(boardId: string): Promise<void> {
  await wait();
  require(boardId, "owner");
  boardOrThrow(boardId);
  db.tasks = db.tasks.filter((t) => t.boardId !== boardId);
  db.columns = db.columns.filter((c) => c.boardId !== boardId);
  db.members = db.members.filter((m) => m.boardId !== boardId);
  db.links = db.links.filter((l) => l.boardId !== boardId);
  db.boards = db.boards.filter((b) => b.id !== boardId);
  simulatedRoles.delete(boardId);
}

export async function transferOwnership(boardId: string, toUserId: string): Promise<BoardMemberDetail[]> {
  await wait();
  require(boardId, "owner");
  if (toUserId === CURRENT_USER_ID) throw new ApiError("You already own this board");
  const target = db.members.find((m) => m.boardId === boardId && m.userId === toUserId);
  if (!target) throw new ApiError("That person is not a member of this board", 404);
  const currentOwner = db.members.find((m) => m.boardId === boardId && m.role === "owner")!;
  currentOwner.role = "editor";
  target.role = "owner";
  return listMembers(boardId);
}

/* -------------------------------- Columns -------------------------------- */

export async function createColumn(boardId: string, name: string): Promise<Column> {
  await wait();
  require(boardId, "editor");
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError("Column name is required");
  assertNotDoneName(trimmed);
  const siblings = db.columns.filter((c) => c.boardId === boardId);
  const column: Column = {
    id: id("c"),
    boardId,
    name: trimmed,
    order: orderForIndex(siblings, siblings.length),
  };
  db.columns.push(column);
  return clone(column);
}

export async function renameColumn(boardId: string, columnId: string, name: string): Promise<Column> {
  await wait();
  require(boardId, "editor");
  const column = db.columns.find((c) => c.id === columnId && c.boardId === boardId);
  if (!column) throw new ApiError("Column not found", 404);
  if (isDone(column)) throw new ApiError("The Done column cannot be renamed");
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError("Column name is required");
  assertNotDoneName(trimmed);
  column.name = trimmed;
  return clone(column);
}

export async function deleteColumn(boardId: string, columnId: string): Promise<{ archivedCount: number }> {
  await wait();
  require(boardId, "editor");
  const column = db.columns.find((c) => c.id === columnId && c.boardId === boardId);
  if (!column) throw new ApiError("Column not found", 404);
  if (isDone(column)) throw new ApiError("The Done column cannot be deleted");
  // Tasks are archived, keeping their columnId for history.
  const affected = db.tasks.filter((t) => t.columnId === columnId && !t.archived);
  affected.forEach((t) => {
    t.archived = true;
  });
  db.columns = db.columns.filter((c) => c.id !== columnId);
  return { archivedCount: affected.length };
}

/* --------------------------------- Tasks ---------------------------------- */

export async function createTask(
  boardId: string,
  columnId: string,
  input: { title: string; description?: string; dueDate?: string | null; priority?: Priority },
): Promise<Task> {
  await wait();
  require(boardId, "editor");
  const column = db.columns.find((c) => c.id === columnId && c.boardId === boardId);
  if (!column) throw new ApiError("Column not found", 404);
  const title = input.title.trim();
  if (!title) throw new ApiError("Title is required");
  const siblings = db.tasks.filter((t) => t.columnId === columnId && !t.archived);
  const task: Task = {
    id: id("t"),
    boardId,
    columnId,
    title,
    description: input.description?.trim() ?? "",
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? "Medium",
    order: orderForIndex(siblings, siblings.length),
    archived: false,
    createdAt: new Date().toISOString(),
    createdBy: CURRENT_USER_ID,
  };
  db.tasks.push(task);
  return clone(task);
}

export async function updateTask(
  boardId: string,
  taskId: string,
  patch: { title?: string; description?: string; dueDate?: string | null; priority?: Priority },
): Promise<Task> {
  await wait();
  require(boardId, "editor");
  const task = db.tasks.find((t) => t.id === taskId && t.boardId === boardId);
  if (!task) throw new ApiError("Task not found", 404);
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new ApiError("Title is required");
    task.title = title;
  }
  if (patch.description !== undefined) task.description = patch.description;
  if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
  if (patch.priority !== undefined) task.priority = patch.priority;
  return clone(task);
}

export async function moveTask(
  boardId: string,
  taskId: string,
  toColumnId: string,
  toIndex: number,
): Promise<Task> {
  await wait();
  require(boardId, "editor");
  const task = db.tasks.find((t) => t.id === taskId && t.boardId === boardId);
  if (!task) throw new ApiError("Task not found", 404);
  if (task.archived) throw new ApiError("Archived tasks cannot be moved");
  const column = db.columns.find((c) => c.id === toColumnId && c.boardId === boardId);
  if (!column) throw new ApiError("Column not found", 404);
  const siblings = db.tasks.filter((t) => t.columnId === toColumnId && !t.archived && t.id !== taskId);
  task.order = orderForIndex(siblings, toIndex);
  task.columnId = toColumnId;
  return clone(task);
}

export async function archiveTask(boardId: string, taskId: string): Promise<Task> {
  await wait();
  require(boardId, "editor");
  const task = db.tasks.find((t) => t.id === taskId && t.boardId === boardId);
  if (!task) throw new ApiError("Task not found", 404);
  task.archived = true;
  return clone(task);
}

/** Kept for data-model completeness; no UI surface in this pass. */
export async function unarchiveTask(boardId: string, taskId: string): Promise<Task> {
  await wait();
  require(boardId, "editor");
  const task = db.tasks.find((t) => t.id === taskId && t.boardId === boardId);
  if (!task) throw new ApiError("Task not found", 404);
  const column = db.columns.find((c) => c.id === task.columnId);
  if (!column) throw new ApiError("The original column no longer exists", 409);
  task.archived = false;
  const siblings = db.tasks.filter((t) => t.columnId === task.columnId && !t.archived && t.id !== task.id);
  task.order = orderForIndex(siblings, siblings.length);
  return clone(task);
}

export async function deleteTaskPermanently(boardId: string, taskId: string): Promise<void> {
  await wait();
  require(boardId, "editor");
  const task = db.tasks.find((t) => t.id === taskId && t.boardId === boardId);
  if (!task) throw new ApiError("Task not found", 404);
  if (!task.archived) throw new ApiError("Only archived tasks can be permanently deleted");
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
}

export async function archiveAllInDone(boardId: string): Promise<{ archivedCount: number }> {
  await wait();
  require(boardId, "editor");
  const done = db.columns.find((c) => c.boardId === boardId && isDone(c));
  if (!done) throw new ApiError("This board has no Done column", 404);
  const affected = db.tasks.filter((t) => t.columnId === done.id && !t.archived);
  affected.forEach((t) => {
    t.archived = true;
  });
  return { archivedCount: affected.length };
}

export async function listArchivedTasks(
  boardId: string,
): Promise<Array<Task & { columnName: string }>> {
  await wait();
  require(boardId, "viewer");
  return db.tasks
    .filter((t) => t.boardId === boardId && t.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => ({
      ...clone(t),
      columnName: db.columns.find((c) => c.id === t.columnId)?.name ?? "Deleted column",
    }));
}

/* ------------------------------- Membership ------------------------------- */

export async function listMembers(boardId: string): Promise<BoardMemberDetail[]> {
  await wait();
  require(boardId, "viewer");
  return db.members
    .filter((m) => m.boardId === boardId)
    .map((m) => ({ ...clone(m), user: clone(db.users.find((u) => u.id === m.userId)!) }))
    .sort((a, b) => RANK[b.role] - RANK[a.role] || a.user.name.localeCompare(b.user.name));
}

export async function updateMemberRole(
  boardId: string,
  userId: string,
  role: ShareRole,
): Promise<BoardMemberDetail[]> {
  await wait();
  require(boardId, "owner");
  const member = db.members.find((m) => m.boardId === boardId && m.userId === userId);
  if (!member) throw new ApiError("Member not found", 404);
  if (member.role === "owner") throw new ApiError("Transfer ownership to change the owner's role");
  member.role = role;
  return listMembers(boardId);
}

export async function removeMember(boardId: string, userId: string): Promise<BoardMemberDetail[]> {
  await wait();
  require(boardId, "owner");
  const member = db.members.find((m) => m.boardId === boardId && m.userId === userId);
  if (!member) throw new ApiError("Member not found", 404);
  if (member.role === "owner") {
    throw new ApiError("The owner can't leave — transfer ownership or delete the board first");
  }
  db.members = db.members.filter((m) => !(m.boardId === boardId && m.userId === userId));
  // Removing anyone revokes every currently active link on the board.
  db.links.filter((l) => l.boardId === boardId && !l.revoked).forEach((l) => {
    l.revoked = true;
  });
  return listMembers(boardId);
}

/* ------------------------------ Share links ------------------------------- */

function randomToken(): string {
  return Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-");
}

export async function listShareLinks(boardId: string): Promise<ShareLink[]> {
  await wait();
  require(boardId, "owner");
  return clone(db.links.filter((l) => l.boardId === boardId));
}

export async function createShareLink(boardId: string, role: ShareRole): Promise<ShareLink> {
  await wait();
  require(boardId, "owner");
  const link: ShareLink = {
    id: id("sl"),
    boardId,
    role,
    token: randomToken(),
    createdBy: CURRENT_USER_ID,
    revoked: false,
  };
  db.links.push(link);
  return clone(link);
}

export async function revokeShareLink(boardId: string, linkId: string): Promise<ShareLink> {
  await wait();
  require(boardId, "owner");
  const link = db.links.find((l) => l.id === linkId && l.boardId === boardId);
  if (!link) throw new ApiError("Share link not found", 404);
  link.revoked = true;
  return clone(link);
}

export async function redeemShareLink(
  token: string,
): Promise<{ boardId: string; boardName: string; role: Role; changed: boolean }> {
  await wait();
  const link = db.links.find((l) => l.token.toUpperCase() === token.trim().toUpperCase());
  if (!link) throw new ApiError("This invite link is not valid", 404);
  if (link.revoked) throw new ApiError("This invite link has been revoked", 410);
  const board = db.boards.find((b) => b.id === link.boardId);
  if (!board) throw new ApiError("The board for this link no longer exists", 404);

  const existing = db.members.find((m) => m.boardId === board.id && m.userId === CURRENT_USER_ID);
  if (!existing) {
    db.members.push({ boardId: board.id, userId: CURRENT_USER_ID, role: link.role });
    return { boardId: board.id, boardName: board.name, role: link.role, changed: true };
  }
  // Upgrade only — a link never downgrades an existing membership.
  if (RANK[link.role] > RANK[existing.role]) {
    existing.role = link.role;
    return { boardId: board.id, boardName: board.name, role: link.role, changed: true };
  }
  return { boardId: board.id, boardName: board.name, role: existing.role, changed: false };
}
