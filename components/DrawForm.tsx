"use client";

import { useState } from "react";

export interface DrawFormValues {
  eventDate: string; // YYYY-MM-DD, empty until chosen
  eventTime: string; // HH:MM
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
  const [eventDate, setEventDate] = useState(initial.eventDate);
  const [eventTime, setEventTime] = useState(initial.eventTime);
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
    if (!eventDate) return setError("Välj datum för julklappsutdelningen.");
    if (!eventTime) return setError("Välj tid för julklappsutdelningen.");
    if (filled.length < 2) return setError("Lägg till minst 2 personer.");
    if (new Set(filled.map((p) => p.name.toLowerCase())).size !== filled.length) {
      return setError("Två personer har samma namn. Lägg till efternamn eller initial så att alla kan skilja dem åt.");
    }
    if (!budgetMessage.trim()) return setError("Lägg till en budget.");
    if (!eventDetails.trim()) return setError("Lägg till när och var julklapparna delas ut.");

    setBusy(true);
    try {
      await onSubmit({
        eventDate,
        eventTime,
        people: filled,
        budgetMessage: budgetMessage.trim(),
        eventDetails: eventDetails.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Det gick inte. Försök igen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="when">
        <label className="field">
          <span className="field-label">
            Datum <span className="field-hint">(för utdelningen)</span>
          </span>
          <input type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Tid</span>
          <input type="time" className="input" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
        </label>
      </div>

      <fieldset className="field">
        <legend className="field-label">
          Personer <span className="field-hint">({people.filter((p) => p.name.trim()).length} tillagda)</span>
        </legend>
        <div className="people">
          {people.map((person, index) => (
            <div key={person.id ?? `new-${index}`} className="person">
              <input
                type="text"
                className="input"
                value={person.name}
                onChange={(e) => rename(index, e.target.value)}
                placeholder="Namn"
                aria-label={`Person ${index + 1}`}
              />
              {people.length > 2 && (
                <button
                  type="button"
                  className="person-remove"
                  onClick={() => remove(index)}
                  aria-label={`Ta bort ${person.name || `person ${index + 1}`}`}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="link add-person" onClick={() => setPeople([...people, { name: "" }])}>
          Lägg till en person
        </button>
      </fieldset>

      <label className="field">
        <span className="field-label">Budget</span>
        <input
          type="text"
          className="input"
          value={budgetMessage}
          onChange={(e) => setBudgetMessage(e.target.value)}
          placeholder="Runt 200 kr"
        />
      </label>

      <label className="field">
        <span className="field-label">När och var</span>
        <textarea
          className="input"
          value={eventDetails}
          onChange={(e) => setEventDetails(e.target.value)}
          placeholder={"Julbord 12 december kl. 18.00\nJulklapparna öppnas efter efterrätten"}
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
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
