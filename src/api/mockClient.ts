/**
 * mockClient.ts
 *
 * The ONLY module that knows about backend operations. It now talks to the real
 * FastAPI backend over HTTP (see openapi.yaml). Exported function names,
 * signatures and DTO shapes are unchanged, so no component needs to change.
 *
 * Auth uses an httpOnly session cookie, so every request sends
 * `credentials: "include"`.
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

export type ArchivedTask = Task & { columnName: string };

/* ------------------------------- HTTP layer ------------------------------- */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api";

const DEFAULT_MESSAGE: Record<number, string> = {
  400: "That request wasn't valid",
  401: "Please sign in to continue",
  403: "You don't have permission to do that",
  404: "Not found",
  409: "That action conflicts with the current state",
  410: "This link is no longer available",
};

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = { method, credentials: "include" };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, init);

  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  if (!res.ok) {
    let message = DEFAULT_MESSAGE[res.status] ?? "Something went wrong";
    try {
      const data = (await res.json()) as { message?: string; detail?: unknown };
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : typeof (data?.detail as { message?: string })?.message === "string"
            ? (data.detail as { message: string }).message
            : undefined;
      if (typeof data?.message === "string" && data.message) message = data.message;
      else if (detail) message = detail;
    } catch {
      /* non-JSON error body: keep the default message */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const enc = encodeURIComponent;

/* --------------------------------- Session -------------------------------- */

/** Throws ApiError(401) when there is no valid session. */
export async function getCurrentUser(): Promise<User> {
  return request<User>("GET", "/me");
}

export async function signUp(input: {
  email: string;
  name: string;
  password: string;
}): Promise<User> {
  return request<User>("POST", "/auth/signup", input);
}

export async function signIn(input: { email: string; password: string }): Promise<User> {
  return request<User>("POST", "/auth/signin", input);
}

/* --------------------------------- Boards -------------------------------- */

export async function listBoards(): Promise<BoardSummary[]> {
  return request<BoardSummary[]>("GET", "/boards");
}

export async function getBoard(boardId: string): Promise<BoardContents> {
  return request<BoardContents>("GET", `/boards/${enc(boardId)}`);
}

export async function createBoard(name: string): Promise<Board> {
  return request<Board>("POST", "/boards", { name: name.trim() });
}

export async function renameBoard(boardId: string, name: string): Promise<Board> {
  return request<Board>("PATCH", `/boards/${enc(boardId)}`, { name: name.trim() });
}

export async function deleteBoard(boardId: string): Promise<void> {
  await request<void>("DELETE", `/boards/${enc(boardId)}`);
}

export async function transferOwnership(
  boardId: string,
  toUserId: string,
): Promise<BoardMemberDetail[]> {
  return request<BoardMemberDetail[]>("POST", `/boards/${enc(boardId)}/transfer-ownership`, {
    toUserId,
  });
}

/* -------------------------------- Columns -------------------------------- */

export async function createColumn(boardId: string, name: string): Promise<Column> {
  return request<Column>("POST", `/boards/${enc(boardId)}/columns`, { name: name.trim() });
}

export async function renameColumn(
  boardId: string,
  columnId: string,
  name: string,
): Promise<Column> {
  return request<Column>("PATCH", `/boards/${enc(boardId)}/columns/${enc(columnId)}`, {
    name: name.trim(),
  });
}

export async function deleteColumn(
  boardId: string,
  columnId: string,
): Promise<{ archivedCount: number }> {
  return request<{ archivedCount: number }>(
    "DELETE",
    `/boards/${enc(boardId)}/columns/${enc(columnId)}`,
  );
}

/** Move a column to a new index. Done is pinned as the rightmost column. */
export async function reorderColumn(
  boardId: string,
  columnId: string,
  index: number,
): Promise<Column[]> {
  return request<Column[]>("POST", `/boards/${enc(boardId)}/columns/${enc(columnId)}/reorder`, {
    index,
  });
}

/* --------------------------------- Tasks ---------------------------------- */

export async function createTask(
  boardId: string,
  columnId: string,
  input: { title: string; description?: string; dueDate?: string | null; priority?: Priority },
): Promise<Task> {
  return request<Task>("POST", `/boards/${enc(boardId)}/columns/${enc(columnId)}/tasks`, {
    title: input.title.trim(),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
  });
}

export async function updateTask(
  boardId: string,
  taskId: string,
  patch: { title?: string; description?: string; dueDate?: string | null; priority?: Priority },
): Promise<Task> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body["title"] = patch.title.trim();
  if (patch.description !== undefined) body["description"] = patch.description;
  if (patch.dueDate !== undefined) body["dueDate"] = patch.dueDate;
  if (patch.priority !== undefined) body["priority"] = patch.priority;
  return request<Task>("PATCH", `/boards/${enc(boardId)}/tasks/${enc(taskId)}`, body);
}

export async function moveTask(
  boardId: string,
  taskId: string,
  toColumnId: string,
  toIndex: number,
): Promise<Task> {
  return request<Task>("POST", `/boards/${enc(boardId)}/tasks/${enc(taskId)}/move`, {
    toColumnId,
    toIndex,
  });
}

export async function archiveTask(boardId: string, taskId: string): Promise<Task> {
  return request<Task>("POST", `/boards/${enc(boardId)}/tasks/${enc(taskId)}/archive`);
}

/** Kept for data-model completeness; no UI surface. */
export async function unarchiveTask(boardId: string, taskId: string): Promise<Task> {
  return request<Task>("POST", `/boards/${enc(boardId)}/tasks/${enc(taskId)}/unarchive`);
}

/** Puts an archived task back on the board and returns the refreshed archive list. */
export async function restoreTask(boardId: string, taskId: string): Promise<ArchivedTask[]> {
  return request<ArchivedTask[]>("POST", `/boards/${enc(boardId)}/tasks/${enc(taskId)}/restore`);
}

export async function deleteTaskPermanently(boardId: string, taskId: string): Promise<void> {
  await request<void>("DELETE", `/boards/${enc(boardId)}/tasks/${enc(taskId)}`);
}

export async function archiveAllInDone(boardId: string): Promise<{ archivedCount: number }> {
  return request<{ archivedCount: number }>("POST", `/boards/${enc(boardId)}/archive-done`);
}

export async function listArchivedTasks(boardId: string): Promise<ArchivedTask[]> {
  return request<ArchivedTask[]>("GET", `/boards/${enc(boardId)}/archived-tasks`);
}

/* ------------------------------- Membership ------------------------------- */

export async function listMembers(boardId: string): Promise<BoardMemberDetail[]> {
  return request<BoardMemberDetail[]>("GET", `/boards/${enc(boardId)}/members`);
}

export async function updateMemberRole(
  boardId: string,
  userId: string,
  role: ShareRole,
): Promise<BoardMemberDetail[]> {
  return request<BoardMemberDetail[]>(
    "PATCH",
    `/boards/${enc(boardId)}/members/${enc(userId)}`,
    { role },
  );
}

export async function removeMember(boardId: string, userId: string): Promise<BoardMemberDetail[]> {
  return request<BoardMemberDetail[]>("DELETE", `/boards/${enc(boardId)}/members/${enc(userId)}`);
}

/* ------------------------------ Share links ------------------------------- */

export async function listShareLinks(boardId: string): Promise<ShareLink[]> {
  return request<ShareLink[]>("GET", `/boards/${enc(boardId)}/share-links`);
}

export async function createShareLink(boardId: string, role: ShareRole): Promise<ShareLink> {
  return request<ShareLink>("POST", `/boards/${enc(boardId)}/share-links`, { role });
}

export async function revokeShareLink(boardId: string, linkId: string): Promise<ShareLink> {
  return request<ShareLink>("POST", `/boards/${enc(boardId)}/share-links/${enc(linkId)}/revoke`);
}

export async function redeemShareLink(
  token: string,
): Promise<{ boardId: string; boardName: string; role: Role; changed: boolean }> {
  return request("POST", "/share-links/redeem", { token: token.trim() });
}
