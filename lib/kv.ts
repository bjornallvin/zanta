import { kv } from "@vercel/kv";

// Unique prefix for this Secret Santa app to avoid conflicts with other projects
const KV_PREFIX = "secretsanta:";

// Types
// active: the one running draw. archived: kept in history, links closed.
// Deleting removes a draw and its participants entirely.
export type DrawStatus = "active" | "archived";

export interface Draw {
  id: string;
  status: DrawStatus;
  budgetMessage: string;
  eventDetails: string;
  createdAt: number;
  archivedAt: number | null;
  participantIds: string[];
}

export interface Participant {
  id: string;
  drawId: string;
  name: string;
  assignedTo: string; // participant ID they give a gift to
  hasRevealed: boolean;
}

// KV keys
//   secretsanta:draws             list of draw ids, newest first
//   secretsanta:active-draw       id of the one active draw (absent when none)
//   secretsanta:draw:{id}         Draw
//   secretsanta:participant:{id}  Participant; the id is the secret link
const DRAWS_KEY = `${KV_PREFIX}draws`;
const ACTIVE_KEY = `${KV_PREFIX}active-draw`;
const DRAW_KEY = (id: string) => `${KV_PREFIX}draw:${id}`;
const PARTICIPANT_KEY = (id: string) => `${KV_PREFIX}participant:${id}`;

export class ActiveDrawExistsError extends Error {
  constructor() {
    super("A draw is already active. Archive or delete it before creating a new one.");
  }
}

export async function createDraw(
  participantNames: string[],
  budgetMessage: string,
  eventDetails: string
): Promise<{ draw: Draw; participants: Participant[] }> {
  const drawId = generateUniqueId();

  // Claim the active slot atomically: fails if another draw holds it
  const claimed = await kv.set(ACTIVE_KEY, drawId, { nx: true });
  if (claimed === null) {
    throw new ActiveDrawExistsError();
  }

  const people = participantNames.map((name) => ({ id: generateUniqueId(), name }));

  // Draw everyone up front: shuffle into a circle, each gives to the next.
  // No one can draw themselves, and the draw can't dead-end on the last reveal.
  const circle = shuffle(people);
  const participants: Participant[] = circle.map((p, i) => ({
    id: p.id,
    drawId,
    name: p.name,
    assignedTo: circle[(i + 1) % circle.length].id,
    hasRevealed: false,
  }));
  // Keep the order the admin typed the names in
  participants.sort((a, b) => people.findIndex((p) => p.id === a.id) - people.findIndex((p) => p.id === b.id));

  const draw: Draw = {
    id: drawId,
    status: "active",
    budgetMessage,
    eventDetails,
    createdAt: Date.now(),
    archivedAt: null,
    participantIds: participants.map((p) => p.id),
  };

  try {
    const tx = kv.multi();
    tx.set(DRAW_KEY(drawId), draw);
    for (const participant of participants) {
      tx.set(PARTICIPANT_KEY(participant.id), participant);
    }
    tx.lpush(DRAWS_KEY, drawId);
    await tx.exec();
  } catch (error) {
    // Release the slot so a failed write doesn't block every future draw
    await kv.del(ACTIVE_KEY);
    throw error;
  }

  return { draw, participants };
}

export async function getDraw(id: string): Promise<Draw | null> {
  return await kv.get<Draw>(DRAW_KEY(id));
}

export async function getActiveDraw(): Promise<Draw | null> {
  const id = await kv.get<string>(ACTIVE_KEY);
  return id ? await getDraw(id) : null;
}

export async function listDraws(): Promise<Draw[]> {
  const ids = await kv.lrange<string>(DRAWS_KEY, 0, -1);
  if (!ids.length) return [];
  const draws = await kv.mget<(Draw | null)[]>(...ids.map(DRAW_KEY));
  return draws.filter((d): d is Draw => d !== null);
}

export async function getParticipants(draw: Draw): Promise<Participant[]> {
  if (!draw.participantIds.length) return [];
  const participants = await kv.mget<(Participant | null)[]>(...draw.participantIds.map(PARTICIPANT_KEY));
  return participants.filter((p): p is Participant => p !== null);
}

export async function getParticipant(id: string): Promise<Participant | null> {
  return await kv.get<Participant>(PARTICIPANT_KEY(id));
}

// Archives the active draw: it stays in history, its links stop working
export async function archiveActiveDraw(): Promise<Draw | null> {
  const draw = await getActiveDraw();
  if (!draw) return null;

  const archived: Draw = { ...draw, status: "archived", archivedAt: Date.now() };
  await kv.set(DRAW_KEY(draw.id), archived);
  await kv.del(ACTIVE_KEY);
  return archived;
}

// Makes an archived draw the active one; the draw that was active is archived
export async function activateDraw(id: string): Promise<{ draw: Draw; archived: Draw | null }> {
  const draw = await getDraw(id);
  if (!draw) throw new DrawNotFoundError();
  if (draw.status === "active") return { draw, archived: null };

  // Swap the pointer and learn the previous holder in one step
  const previousId = await kv.set<string>(ACTIVE_KEY, id, { get: true });

  const active: Draw = { ...draw, status: "active", archivedAt: null };
  await kv.set(DRAW_KEY(id), active);

  let archived: Draw | null = null;
  const previous = previousId && previousId !== id ? await getDraw(previousId) : null;
  if (previous) {
    archived = { ...previous, status: "archived", archivedAt: Date.now() };
    await kv.set(DRAW_KEY(previous.id), archived);
  }

  return { draw: active, archived };
}

export interface DrawEdit {
  budgetMessage: string;
  eventDetails: string;
  people: { id?: string; name: string }[]; // id for existing people, none for new ones
}

// Edits a draw, active or archived. Renames keep everything; adding or removing people
// makes a new draw for everyone (same links, new matches, nobody has opened yet).
export async function updateDraw(id: string, edit: DrawEdit): Promise<{ draw: Draw; redrawn: boolean }> {
  const draw = await getDraw(id);
  if (!draw) throw new DrawNotFoundError();

  const existing = new Map((await getParticipants(draw)).map((p) => [p.id, p]));
  const people = edit.people.map((p) => ({
    id: p.id && existing.has(p.id) ? p.id : generateUniqueId(),
    name: p.name,
  }));

  const keptIds = new Set(people.map((p) => p.id));
  const removedIds = draw.participantIds.filter((pid) => !keptIds.has(pid));
  const redrawn = removedIds.length > 0 || people.some((p) => !existing.has(p.id));

  let participants: Participant[];
  if (redrawn) {
    const circle = shuffle(people);
    const next = new Map(circle.map((p, i) => [p.id, circle[(i + 1) % circle.length].id]));
    participants = people.map((p) => ({
      id: p.id,
      drawId: id,
      name: p.name,
      assignedTo: next.get(p.id)!,
      hasRevealed: false,
    }));
  } else {
    participants = people.map((p) => ({ ...existing.get(p.id)!, name: p.name }));
  }

  const updated: Draw = {
    ...draw,
    budgetMessage: edit.budgetMessage,
    eventDetails: edit.eventDetails,
    participantIds: participants.map((p) => p.id),
  };

  const tx = kv.multi();
  tx.set(DRAW_KEY(id), updated);
  for (const participant of participants) {
    tx.set(PARTICIPANT_KEY(participant.id), participant);
  }
  for (const pid of removedIds) {
    tx.del(PARTICIPANT_KEY(pid));
  }
  await tx.exec();

  return { draw: updated, redrawn };
}

export class DrawNotFoundError extends Error {
  constructor() {
    super("Draw not found");
  }
}

// Removes a draw (active or archived) and all its participants for good
export async function deleteDraw(id: string): Promise<boolean> {
  const draw = await getDraw(id);
  if (!draw) return false;

  const tx = kv.multi();
  for (const participantId of draw.participantIds) {
    tx.del(PARTICIPANT_KEY(participantId));
  }
  tx.del(DRAW_KEY(id));
  tx.lrem(DRAWS_KEY, 0, id);
  await tx.exec();

  // Free the active slot only if this draw holds it
  if ((await kv.get<string>(ACTIVE_KEY)) === id) {
    await kv.del(ACTIVE_KEY);
  }
  return true;
}

export class DrawArchivedError extends Error {
  constructor() {
    super("This Secret Santa draw is closed.");
  }
}

// Looks up who the participant gives to, and marks them as revealed
export async function revealAssignment(
  participantId: string
): Promise<{ participant: Participant; draw: Draw; assignedName: string }> {
  const participant = await getParticipant(participantId);
  if (!participant) {
    throw new Error("Participant not found");
  }

  const draw = await getDraw(participant.drawId);
  if (!draw) {
    throw new Error("Draw not found");
  }
  if (draw.status !== "active") {
    throw new DrawArchivedError();
  }

  const assignedPerson = await getParticipant(participant.assignedTo);
  if (!assignedPerson) {
    throw new Error("No assignment found for this participant");
  }

  // Only this participant's own key changes, so concurrent reveals can't overwrite each other
  if (!participant.hasRevealed) {
    participant.hasRevealed = true;
    await kv.set(PARTICIPANT_KEY(participant.id), participant);
  }

  return { participant, draw, assignedName: assignedPerson.name };
}

// Fisher-Yates shuffle, returns a new array
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate unique ID for draws and participants
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
