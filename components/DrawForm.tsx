"use client";

import { useState } from "react";

export interface DrawFormValues {
  people: { id?: string; name: string }[];
  budgetMessage: string;
  eventDetails: string;
}

interface DrawFormProps {
  initial: DrawFormValues;
  submitLabel: string;
  busyLabel: string;
  note?: string;
  onSubmit: (values: DrawFormValues) => Promise<void>;
  onCancel?: () => void;
}

// People, budget and details; used to create a draw and to edit an archived one
export default function DrawForm({ initial, submitLabel, busyLabel, note, onSubmit, onCancel }: DrawFormProps) {
  const [people, setPeople] = useState(initial.people);
  const [budgetMessage, setBudgetMessage] = useState(initial.budgetMessage);
  const [eventDetails, setEventDetails] = useState(initial.eventDetails);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rename = (index: number, name: string) =>
    setPeople(people.map((p, i) => (i === index ? { ...p, name } : p)));

  const remove = (index: number) => {
    if (people.length > 2) setPeople(people.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const filled = people.map((p) => ({ ...p, name: p.name.trim() })).filter((p) => p.name);
    if (filled.length < 2) return setError("Add at least 2 people.");
    if (new Set(filled.map((p) => p.name.toLowerCase())).size !== filled.length) {
      return setError("Two people have the same name. Add a last name or initial so everyone can tell them apart.");
    }
    if (!budgetMessage.trim()) return setError("Add a budget.");
    if (!eventDetails.trim()) return setError("Add when and where the gifts are exchanged.");

    setBusy(true);
    try {
      await onSubmit({ people: filled, budgetMessage: budgetMessage.trim(), eventDetails: eventDetails.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="field">
        <legend className="field-label">
          People <span className="field-hint">({people.filter((p) => p.name.trim()).length} added)</span>
        </legend>
        <div className="people">
          {people.map((person, index) => (
            <div key={person.id ?? `new-${index}`} className="person">
              <input
                type="text"
                className="input"
                value={person.name}
                onChange={(e) => rename(index, e.target.value)}
                placeholder="Name"
                aria-label={`Person ${index + 1}`}
              />
              {people.length > 2 && (
                <button
                  type="button"
                  className="person-remove"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${person.name || `person ${index + 1}`}`}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="link add-person" onClick={() => setPeople([...people, { name: "" }])}>
          Add a person
        </button>
      </fieldset>

      <label className="field">
        <span className="field-label">Budget</span>
        <input
          type="text"
          className="input"
          value={budgetMessage}
          onChange={(e) => setBudgetMessage(e.target.value)}
          placeholder="Around 200 SEK"
        />
      </label>

      <label className="field">
        <span className="field-label">When and where</span>
        <textarea
          className="input"
          value={eventDetails}
          onChange={(e) => setEventDetails(e.target.value)}
          placeholder={"Christmas dinner, 12 December at 18:00\nGifts are opened after dessert"}
          rows={3}
        />
      </label>

      {note && <p className="fine" style={{ marginBottom: "1.25rem" }}>{note}</p>}
      {error && <p className="notice">{error}</p>}

      <div className="actions" style={{ marginTop: 0 }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
