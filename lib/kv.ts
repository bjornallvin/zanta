import { kv } from "@vercel/kv";

// Unique prefix for this Secret Santa app to avoid conflicts with other projects
const KV_PREFIX = "secretsanta:";

// Types
export interface Participant {
  id: string;
  name: string;
  hasRevealed: boolean;
  assignedTo: string | null; // participant ID they are assigned to
}

export interface SecretSantaEvent {
  participants: Participant[];
  budgetMessage: string;
  eventDetails: string;
  createdAt: number;
}

// KV Keys
const EVENT_KEY = `${KV_PREFIX}event`;
const PARTICIPANT_KEY = (id: string) => `${KV_PREFIX}participant:${id}`;

// Event functions
export async function createEvent(
  participantNames: string[],
  budgetMessage: string,
  eventDetails: string
): Promise<SecretSantaEvent> {
  const participants: Participant[] = participantNames.map((name) => ({
    id: generateUniqueId(),
    name,
    hasRevealed: false,
    assignedTo: null,
  }));

  const event: SecretSantaEvent = {
    participants,
    budgetMessage,
    eventDetails,
    createdAt: Date.now(),
  };

  await kv.set(EVENT_KEY, event);

  // Store each participant individually for easy lookup
  for (const participant of participants) {
    await kv.set(PARTICIPANT_KEY(participant.id), participant);
  }

  return event;
}

export async function getEvent(): Promise<SecretSantaEvent | null> {
  return await kv.get<SecretSantaEvent>(EVENT_KEY);
}

export async function getParticipant(
  id: string
): Promise<Participant | null> {
  return await kv.get<Participant>(PARTICIPANT_KEY(id));
}

export async function updateParticipant(
  participant: Participant
): Promise<void> {
  await kv.set(PARTICIPANT_KEY(participant.id), participant);

  // Also update in the event object
  const event = await getEvent();
  if (event) {
    const index = event.participants.findIndex((p) => p.id === participant.id);
    if (index !== -1) {
      event.participants[index] = participant;
      await kv.set(EVENT_KEY, event);
    }
  }
}

// Assignment logic - assign on reveal
export async function assignSecretSanta(
  participantId: string
): Promise<string> {
  const event = await getEvent();
  if (!event) {
    throw new Error("Event not found");
  }

  const currentParticipant = event.participants.find(
    (p) => p.id === participantId
  );
  if (!currentParticipant) {
    throw new Error("Participant not found");
  }

  // If already assigned, return existing assignment
  if (currentParticipant.assignedTo) {
    const assignedPerson = event.participants.find(
      (p) => p.id === currentParticipant.assignedTo
    );
    return assignedPerson?.name || "";
  }

  // Get all unassigned participants (excluding current participant)
  const unassignedParticipants = event.participants.filter(
    (p) => p.id !== participantId && !isParticipantAssigned(p.id, event)
  );

  if (unassignedParticipants.length === 0) {
    throw new Error("No available participants to assign");
  }

  // Randomly select one
  const randomIndex = Math.floor(Math.random() * unassignedParticipants.length);
  const assignedPerson = unassignedParticipants[randomIndex];

  // Update current participant
  currentParticipant.assignedTo = assignedPerson.id;
  currentParticipant.hasRevealed = true;
  await updateParticipant(currentParticipant);

  return assignedPerson.name;
}

// Helper to check if a participant has been assigned to someone
function isParticipantAssigned(
  participantId: string,
  event: SecretSantaEvent
): boolean {
  return event.participants.some((p) => p.assignedTo === participantId);
}

// Generate unique ID for participants
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Delete event (useful for testing/resetting)
export async function deleteEvent(): Promise<void> {
  const event = await getEvent();
  if (event) {
    // Delete all participant keys
    for (const participant of event.participants) {
      await kv.del(PARTICIPANT_KEY(participant.id));
    }
  }
  await kv.del(EVENT_KEY);
}
