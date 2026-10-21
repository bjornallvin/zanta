"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import DrawForm, { DrawFormValues } from "@/components/DrawForm";

interface Participant {
  id: string; // the secret link
  name: string;
  hasRevealed: boolean;
}

interface DrawSummary {
  id: string;
  status: "active" | "archived";
  participants: Participant[];
  budgetMessage: string;
  eventDetails: string;
  createdAt: number;
  archivedAt: number | null;
}

const NEW_DRAW: DrawFormValues = {
  people: Array.from({ length: 6 }, () => ({ name: "" })),
  budgetMessage: "Around 200 SEK",
  eventDetails: "",
};
const PASSWORD_KEY = "zanta-admin-password";

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

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
  const [currentDraw, setCurrentDraw] = useState<DrawSummary | null>(null);
  const [archivedDraws, setArchivedDraws] = useState<DrawSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraws, setIsLoadingDraws] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const lock = (text: string) => {
    storePassword(null);
    setPassword("");
    setUnlocked(false);
    setGateError(text);
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

  // POST JSON to an admin route; throws with the server's message on failure
  const post = async (url: string, body?: object) => {
    const response = await adminFetch(url, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "That didn't work. Try again.");
    return data;
  };

  const loadDraws = async (pw: string) => {
    try {
      const response = await adminFetch("/api/event-status", pw);
      if (response.ok) {
        const data = await response.json();
        setCurrentDraw(data.active);
        setArchivedDraws(data.archived);
        setPassword(pw);
        setUnlocked(true);
        storePassword(pw);
      }
    } catch (err) {
      console.error("Failed to load draws:", err);
    } finally {
      setIsLoadingDraws(false);
    }
  };

  useEffect(() => {
    const stored = readStoredPassword();
    if (stored) {
      loadDraws(stored);
    } else {
      setIsLoadingDraws(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setGateError("");
    setIsLoadingDraws(true);
    loadDraws(passwordInput);
    setPasswordInput("");
  };

  const handleCreate = async (values: DrawFormValues) => {
    setMessage("");
    await post("/api/setup", {
      participantNames: values.people.map((p) => p.name),
      budgetMessage: values.budgetMessage,
      eventDetails: values.eventDetails,
    });
    setMessage("Draw created. Copy each person's link and send it to them.");
    await loadDraws(password);
  };

  const handleUpdate = async (draw: DrawSummary, values: DrawFormValues) => {
    setMessage("");
    const { redrawn } = await post("/api/update-draw", { drawId: draw.id, ...values });
    setEditingId(null);
    setMessage(redrawn ? "Draw saved. The people changed, so everyone has a new match." : "Draw saved.");
    await loadDraws(password);
  };

  // Archive, activate or delete, then reload the overview
  const changeDraw = async (url: string, body: object | undefined, done: string) => {
    setIsLoading(true);
    setError("");
    setMessage("");
    try {
      await post(url, body);
      setEditingId(null);
      setMessage(done);
      await loadDraws(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    if (!confirm("Archive this draw? Its links stop working until you make it active again.")) return;
    changeDraw("/api/archive-draw", undefined, "Draw archived.");
  };

  const handleActivate = (draw: DrawSummary) => {
    const question = currentDraw
      ? "Make this draw active? The current draw gets archived and its links stop working."
      : "Make this draw active? Its links start working again.";
    if (!confirm(question)) return;
    changeDraw("/api/activate-draw", { drawId: draw.id }, "Draw is active. Its links work again.");
  };

  const handleDelete = (draw: DrawSummary) => {
    if (!confirm("Delete this draw for good? Its links stop working and it can't be brought back.")) return;
    changeDraw("/api/delete-draw", { drawId: draw.id }, "Draw deleted.");
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const linkFor = (p: Participant) => `${window.location.origin}/reveal/${p.id}`;

  const copyAllLinks = () =>
    copy("all", (currentDraw?.participants ?? []).map((p) => `${p.name}: ${linkFor(p)}`).join("\n"));

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
            <button type="submit" className="btn btn-primary" disabled={isLoadingDraws || !passwordInput}>
              {isLoadingDraws ? "Checking" : "Unlock"}
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  const opened = currentDraw?.participants.filter((p) => p.hasRevealed).length ?? 0;
  const total = currentDraw?.participants.length ?? 0;

  return (
    <Shell>
      <div className="stage stage-wide">
        <h1 className="title">Secret Santa admin</h1>
        <p className="lead">
          Add everyone, create the draw, then send each person their own link.
          Nobody, including you, can see who got whom.
        </p>

        {message && <p className="notice ok" style={{ marginTop: "2rem" }}>{message}</p>}
        {error && <p className="notice" style={{ marginTop: "2rem" }}>{error}</p>}

        {!isLoadingDraws && currentDraw && (
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

            <div className="links-head">
              <p className="fine">Each link belongs to one person. Send it only to them.</p>
              <button className="btn btn-quiet" onClick={copyAllLinks}>
                {copied === "all" ? "Copied" : "Copy all links"}
              </button>
            </div>
            <ul className="links">
              {currentDraw.participants.map((p) => (
                <li key={p.id}>
                  <span className={`who${p.hasRevealed ? "" : " waiting"}`}>
                    <span className={`dot${p.hasRevealed ? " on" : ""}`} />
                    {p.name}
                    <span className="sr-only">{p.hasRevealed ? " has opened their link" : " has not opened their link yet"}</span>
                  </span>
                  <button className="btn btn-quiet" onClick={() => copy(p.id, linkFor(p))}>
                    {copied === p.id ? "Copied" : "Copy link"}
                  </button>
                  <span className="url">{linkFor(p)}</span>
                </li>
              ))}
            </ul>

            <dl className="meta">
              <div>
                <dt>Budget</dt>
                <dd>{currentDraw.budgetMessage}</dd>
              </div>
              <div>
                <dt>When and where</dt>
                <dd>{currentDraw.eventDetails}</dd>
              </div>
            </dl>

            <div className="actions">
              <span className="fine">Created {formatDate(currentDraw.createdAt)}</span>
              <button className="btn btn-quiet" onClick={handleArchive} disabled={isLoading}>
                Archive this draw
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(currentDraw)} disabled={isLoading}>
                Delete
              </button>
            </div>
          </section>
        )}

        {!isLoadingDraws && !currentDraw && (
          <section className="section" aria-labelledby="new-title">
            <h2 id="new-title" className="section-title" style={{ marginBottom: "1.5rem" }}>
              New draw
            </h2>
            <DrawForm
              initial={NEW_DRAW}
              submitLabel="Create the draw"
              busyLabel="Creating the draw"
              onSubmit={handleCreate}
            />
          </section>
        )}

        {archivedDraws.length > 0 && (
          <section className="section" aria-labelledby="archived-title">
            <h2 id="archived-title" className="section-title" style={{ marginBottom: "1rem" }}>
              Archived draws
            </h2>
            <ul className="links">
              {archivedDraws.map((draw) => {
                const drawOpened = draw.participants.filter((p) => p.hasRevealed).length;
                const editing = editingId === draw.id;
                return (
                  <li key={draw.id} className={editing ? "editing" : ""}>
                    <span className="who">{formatDate(draw.createdAt)}</span>
                    {!editing && (
                      <span className="row-actions">
                        <button className="btn btn-quiet" onClick={() => setEditingId(draw.id)} disabled={isLoading}>
                          Edit
                        </button>
                        <button className="btn btn-quiet" onClick={() => handleActivate(draw)} disabled={isLoading}>
                          Make active
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(draw)} disabled={isLoading}>
                          Delete
                        </button>
                      </span>
                    )}
                    <span className="url">
                      {draw.participants.map((p) => p.name).join(", ")}. {drawOpened} of {draw.participants.length} opened
                      their link. {draw.budgetMessage}.
                      {draw.archivedAt ? ` Archived ${formatDate(draw.archivedAt)}.` : ""}
                    </span>
                    {editing && (
                      <div className="edit-panel">
                        <DrawForm
                          initial={{
                            people: draw.participants.map((p) => ({ id: p.id, name: p.name })),
                            budgetMessage: draw.budgetMessage,
                            eventDetails: draw.eventDetails,
                          }}
                          submitLabel="Save changes"
                          busyLabel="Saving"
                          note="Renaming keeps everyone's match. Adding or removing people makes a new draw for everyone: the links stay the same, but who buys for whom changes."
                          onSubmit={(values) => handleUpdate(draw, values)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Shell>
  );
}
