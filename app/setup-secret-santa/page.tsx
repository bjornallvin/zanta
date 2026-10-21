"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";

interface GeneratedLink {
  name: string;
  url: string;
}

interface Participant {
  name: string;
  hasRevealed: boolean;
}

interface CurrentEvent {
  participants: Participant[];
  budgetMessage: string;
  eventDetails: string;
  createdAt: number;
}

const DEFAULT_BUDGET = "Around 200 SEK";
const EMPTY_PEOPLE = ["", "", "", "", "", ""];
const PASSWORD_KEY = "zanta-admin-password";

function readStoredPassword() {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePassword(value: string | null) {
  try {
    if (value) sessionStorage.setItem(PASSWORD_KEY, value);
    else sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    // Storage unavailable: the password just isn't remembered
  }
}

export default function SetupPage() {
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [gateError, setGateError] = useState("");
  const [participantNames, setParticipantNames] = useState<string[]>(EMPTY_PEOPLE);
  const [budgetMessage, setBudgetMessage] = useState(DEFAULT_BUDGET);
  const [eventDetails, setEventDetails] = useState("");
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const lock = (message: string) => {
    storePassword(null);
    setPassword("");
    setUnlocked(false);
    setGateError(message);
  };

  const adminFetch = async (url: string, pw: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, "x-admin-password": pw },
    });
    if (response.status === 401) {
      lock("Wrong password. Try again.");
      throw new Error("Unauthorized");
    }
    return response;
  };

  const loadCurrentEvent = async (pw: string) => {
    try {
      const response = await adminFetch("/api/event-status", pw);
      if (response.ok) {
        const data = await response.json();
        setCurrentEvent(data.event);
        setPassword(pw);
        setUnlocked(true);
        storePassword(pw);
      }
    } catch (err) {
      console.error("Failed to load current event:", err);
    } finally {
      setIsLoadingEvent(false);
    }
  };

  useEffect(() => {
    const stored = readStoredPassword();
    if (stored) {
      loadCurrentEvent(stored);
    } else {
      setIsLoadingEvent(false);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setGateError("");
    setIsLoadingEvent(true);
    loadCurrentEvent(passwordInput);
    setPasswordInput("");
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...participantNames];
    newNames[index] = value;
    setParticipantNames(newNames);
  };

  const addParticipant = () => {
    setParticipantNames([...participantNames, ""]);
  };

  const removeParticipant = (index: number) => {
    if (participantNames.length > 2) {
      setParticipantNames(participantNames.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setGeneratedLinks([]);

    const validNames = participantNames.map((n) => n.trim()).filter(Boolean);
    if (validNames.length < 2) {
      setError("Add at least 2 people.");
      return;
    }
    if (new Set(validNames.map((n) => n.toLowerCase())).size !== validNames.length) {
      setError("Two people have the same name. Add a last name or initial so everyone can tell them apart.");
      return;
    }
    if (!budgetMessage.trim()) {
      setError("Add a budget.");
      return;
    }
    if (!eventDetails.trim()) {
      setError("Add when and where the gifts are exchanged.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminFetch("/api/setup", password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantNames: validNames,
          budgetMessage: budgetMessage.trim(),
          eventDetails: eventDetails.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      const data = await response.json();
      const baseUrl = window.location.origin;
      setGeneratedLinks(
        data.participants.map((p: any) => ({
          name: p.name,
          url: `${baseUrl}/reveal/${p.id}`,
        }))
      );
      await loadCurrentEvent(password);
    } catch (err) {
      setError("The draw wasn't created. Try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const copyAllLinks = () =>
    copy(
      "all",
      generatedLinks.map((link) => `${link.name}: ${link.url}`).join("\n")
    );

  const handleReset = async () => {
    if (!confirm("Delete this draw? Every link that was sent stops working. This can't be undone.")) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await adminFetch("/api/reset", password, { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to reset event");
      }

      setGeneratedLinks([]);
      setCurrentEvent(null);
      setParticipantNames(EMPTY_PEOPLE);
      setBudgetMessage(DEFAULT_BUDGET);
      setEventDetails("");
      setMessage("Draw deleted. You can set up a new one.");
    } catch (err) {
      setError("The draw wasn't deleted. Try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <Shell>
        <div className="stage">
          <h1 className="title">Secret Santa admin</h1>
          <p className="lead">Enter the admin password to manage the draw.</p>
          <form onSubmit={handleUnlock} style={{ marginTop: "2.5rem", maxWidth: "24rem" }}>
            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                className="input"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
            </label>
            {gateError && <p className="notice">{gateError}</p>}
            <button type="submit" className="btn btn-primary" disabled={isLoadingEvent || !passwordInput}>
              {isLoadingEvent ? "Checking" : "Unlock"}
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  const opened = currentEvent?.participants.filter((p) => p.hasRevealed).length ?? 0;
  const total = currentEvent?.participants.length ?? 0;

  return (
    <Shell>
      <div className="stage stage-wide">
        <h1 className="title">Secret Santa admin</h1>
        <p className="lead">
          Add everyone, create the draw, then send each person their own link.
          Nobody, including you, can see who got whom.
        </p>

        {message && <p className="notice ok" style={{ marginTop: "2rem" }}>{message}</p>}

        {!isLoadingEvent && currentEvent && (
          <section className="section" aria-labelledby="current-title">
            <div className="section-head">
              <h2 id="current-title" className="section-title">Current draw</h2>
              <p className="fine">
                {opened} of {total} have opened their link
              </p>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={opened}
              aria-label="Links opened"
            >
              <span style={{ width: `${total ? (opened / total) * 100 : 0}%` }} />
            </div>

            <ul className="roster">
              {currentEvent.participants.map((p, index) => (
                <li key={index} className={p.hasRevealed ? "" : "waiting"}>
                  <span className={`dot${p.hasRevealed ? " on" : ""}`} />
                  {p.name}
                  <span className="sr-only">{p.hasRevealed ? " has opened" : " has not opened yet"}</span>
                </li>
              ))}
            </ul>

            <dl className="meta">
              <div>
                <dt>Budget</dt>
                <dd>{currentEvent.budgetMessage}</dd>
              </div>
              <div>
                <dt>When and where</dt>
                <dd>{currentEvent.eventDetails}</dd>
              </div>
            </dl>

            <div className="actions">
              <span className="fine">
                Created {new Date(currentEvent.createdAt).toLocaleString("en-GB",{ dateStyle: "medium", timeStyle: "short" })}
              </span>
              <button className="btn btn-danger" onClick={handleReset} disabled={isLoading}>
                Delete this draw
              </button>
            </div>
          </section>
        )}

        {generatedLinks.length > 0 && (
          <section className="section" aria-labelledby="links-title">
            <div className="section-head">
              <h2 id="links-title" className="section-title">Send these links</h2>
              <button className="btn btn-quiet" onClick={copyAllLinks}>
                {copied === "all" ? "Copied" : "Copy all links"}
              </button>
            </div>
            <p className="notice">
              Copy the links now. They are shown only once, and each link belongs to one person.
            </p>
            <ul className="links">
              {generatedLinks.map((link) => (
                <li key={link.url}>
                  <span className="who">{link.name}</span>
                  <button className="btn btn-quiet" onClick={() => copy(link.url, link.url)}>
                    {copied === link.url ? "Copied" : "Copy link"}
                  </button>
                  <span className="url">{link.url}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!isLoadingEvent && !currentEvent && (
          <section className="section" aria-labelledby="new-title">
            <h2 id="new-title" className="section-title" style={{ marginBottom: "1.5rem" }}>
              New draw
            </h2>
            <form onSubmit={handleSubmit}>
              <fieldset className="field">
                <legend className="field-label">
                  People <span className="field-hint">({participantNames.filter((n) => n.trim()).length} added)</span>
                </legend>
                <div className="people">
                  {participantNames.map((name, index) => (
                    <div key={index} className="person">
                      <input
                        type="text"
                        className="input"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        placeholder="Name"
                        aria-label={`Person ${index + 1}`}
                      />
                      {participantNames.length > 2 && (
                        <button
                          type="button"
                          className="person-remove"
                          onClick={() => removeParticipant(index)}
                          aria-label={`Remove ${name || `person ${index + 1}`}`}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="link add-person" onClick={addParticipant}>
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

              {error && <p className="notice">{error}</p>}

              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? "Creating the draw" : "Create the draw"}
              </button>
            </form>
          </section>
        )}
      </div>
    </Shell>
  );
}
