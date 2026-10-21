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

// Two views: the list of all draws, and one draw (or a new one)
type View = { kind: "list" } | { kind: "draw"; id: string } | { kind: "new" };

const NEW_DRAW: DrawFormValues = {
  people: Array.from({ length: 6 }, () => ({ name: "" })),
  budgetMessage: "Around 200 SEK",
  eventDetails: "",
};
const PASSWORD_KEY = "zanta-admin-password";

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const openedCount = (draw: DrawSummary) => draw.participants.filter((p) => p.hasRevealed).length;

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
  const [draws, setDraws] = useState<DrawSummary[]>([]);
  const [view, setView] = useState<View>({ kind: "list" });
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
        setDraws([...(data.active ? [data.active] : []), ...data.archived]);
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

  const go = (next: View) => {
    setError("");
    setMessage("");
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setGateError("");
    setIsLoadingDraws(true);
    loadDraws(passwordInput);
    setPasswordInput("");
  };

  const handleCreate = async (values: DrawFormValues) => {
    const { drawId } = await post("/api/setup", {
      participantNames: values.people.map((p) => p.name),
      budgetMessage: values.budgetMessage,
      eventDetails: values.eventDetails,
    });
    await loadDraws(password);
    go({ kind: "draw", id: drawId });
    setMessage("Draw created. Copy each person's link and send it to them.");
  };

  const handleUpdate = async (draw: DrawSummary, values: DrawFormValues) => {
    // Same ids as before means only renames; anything else redraws everyone
    const peopleChanged =
      values.people.length !== draw.participants.length || values.people.some((p) => !p.id);
    const opened = openedCount(draw);
    if (draw.status === "active" && peopleChanged && opened > 0) {
      const ok = confirm(
        `${opened} ${opened === 1 ? "person has" : "people have"} already opened their link. ` +
          "Changing the people gives everyone a new match, so they will see a different person. Save anyway?"
      );
      if (!ok) return;
    }

    setMessage("");
    const { redrawn } = await post("/api/update-draw", { drawId: draw.id, ...values });
    await loadDraws(password);
    setMessage(redrawn ? "Draw saved. The people changed, so everyone has a new match." : "Draw saved.");
  };

  // Archive, activate or delete, then reload
  const changeDraw = async (url: string, body: object | undefined, done: string, after: View) => {
    setIsLoading(true);
    setError("");
    setMessage("");
    try {
      await post(url, body);
      await loadDraws(password);
      setView(after);
      setMessage(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = (draw: DrawSummary) => {
    if (!confirm("Archive this draw? Its links stop working until you make it active again.")) return;
    changeDraw("/api/archive-draw", undefined, "Draw archived.", { kind: "draw", id: draw.id });
  };

  const handleActivate = (draw: DrawSummary) => {
    const question = draws.some((d) => d.status === "active")
      ? "Make this draw active? The current draw gets archived and its links stop working."
      : "Make this draw active? Its links start working again.";
    if (!confirm(question)) return;
    changeDraw("/api/activate-draw", { drawId: draw.id }, "Draw is active. Its links work again.", {
      kind: "draw",
      id: draw.id,
    });
  };

  const handleReset = (draw: DrawSummary) => {
    if (
      !confirm(
        "Reset this draw? Everyone gets a new link and a new match. The old links stop working, so you need to send everyone their new link."
      )
    )
      return;
    changeDraw("/api/reset-draw", { drawId: draw.id }, "Draw reset. Send everyone their new link.", {
      kind: "draw",
      id: draw.id,
    });
  };

  const handleDelete = (draw: DrawSummary) => {
    if (!confirm("Delete this draw for good? Its links stop working and it can't be brought back.")) return;
    changeDraw("/api/delete-draw", { drawId: draw.id }, "Draw deleted.", { kind: "list" });
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const linkFor = (p: Participant) => `${window.location.origin}/reveal/${p.id}`;

  if (!unlocked) {
    return (
      <Shell>
        <div className="stage">
          <h1 className="title">Secret Santa admin</h1>
          <p className="lead">Enter the admin password to manage the draws.</p>
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

  const hasActive = draws.some((d) => d.status === "active");
  const selected = view.kind === "draw" ? draws.find((d) => d.id === view.id) : undefined;

  const notices = (
    <>
      {message && <p className="notice ok" style={{ marginTop: "1.5rem" }}>{message}</p>}
      {error && <p className="notice" style={{ marginTop: "1.5rem" }}>{error}</p>}
    </>
  );

  const back = (
    <button className="link back-link" onClick={() => go({ kind: "list" })}>
      Back to all draws
    </button>
  );

  // ---------- New draw ----------
  if (view.kind === "new") {
    return (
      <Shell>
        <div className="stage stage-wide">
          {back}
          <h1 className="title">New draw</h1>
          {notices}
          <div className="section" style={{ marginTop: "2rem" }}>
            <DrawForm
              initial={NEW_DRAW}
              submitLabel="Create the draw"
              busyLabel="Creating the draw"
              onSubmit={handleCreate}
              onCancel={() => go({ kind: "list" })}
            />
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- One draw ----------
  if (view.kind === "draw" && selected) {
    const opened = openedCount(selected);
    const total = selected.participants.length;
    const active = selected.status === "active";

    return (
      <Shell>
        <div className="stage stage-wide">
          {back}
          <div className="draw-head">
            <h1 className="title">Draw from {formatDate(selected.createdAt)}</h1>
            <span className={`pill${active ? " pill-active" : ""}`}>{active ? "Active" : "Archived"}</span>
          </div>
          <p className="fine" style={{ marginTop: "0.75rem" }}>
            {active
              ? "Links work. Send each person their own link."
              : `Links are closed${selected.archivedAt ? ` since ${formatDate(selected.archivedAt)}` : ""}. Make the draw active to open them again.`}
          </p>
          {notices}

          {active && (
            <section className="section" aria-labelledby="links-title">
              <div className="section-head">
                <h2 id="links-title" className="section-title">Links</h2>
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
                <button
                  className="btn btn-quiet"
                  onClick={() =>
                    copy("all", selected.participants.map((p) => `${p.name}: ${linkFor(p)}`).join("\n"))
                  }
                >
                  {copied === "all" ? "Copied" : "Copy all links"}
                </button>
              </div>
              <ul className="links">
                {selected.participants.map((p) => (
                  <li key={p.id}>
                    <span className={`who${p.hasRevealed ? "" : " waiting"}`}>
                      <span className={`dot${p.hasRevealed ? " on" : ""}`} />
                      {p.name}
                      <span className="sr-only">
                        {p.hasRevealed ? " has opened their link" : " has not opened their link yet"}
                      </span>
                    </span>
                    <button className="btn btn-quiet" onClick={() => copy(p.id, linkFor(p))}>
                      {copied === p.id ? "Copied" : "Copy link"}
                    </button>
                    <span className="url">{linkFor(p)}</span>
                  </li>
                ))}
              </ul>

            </section>
          )}

          <section className="section" aria-labelledby="edit-title">
            <h2 id="edit-title" className="section-title" style={{ marginBottom: "1.5rem" }}>
              People and details
            </h2>
            <DrawForm
              key={`${selected.id}-${selected.budgetMessage}-${selected.eventDetails}-${selected.participants.map((p) => p.id + p.name).join()}`}
              initial={{
                people: selected.participants.map((p) => ({ id: p.id, name: p.name })),
                budgetMessage: selected.budgetMessage,
                eventDetails: selected.eventDetails,
              }}
              submitLabel="Save changes"
              busyLabel="Saving"
              note="Renaming keeps everyone's match. Adding or removing people makes a new draw for everyone: the links stay the same, but who buys for whom changes."
              onSubmit={(values) => handleUpdate(selected, values)}
            />
          </section>

          <div className="actions draw-actions">
            {active ? (
              <>
                <button className="btn btn-quiet" onClick={() => handleReset(selected)} disabled={isLoading}>
                  Reset links
                </button>
                <button className="btn btn-quiet" onClick={() => handleArchive(selected)} disabled={isLoading}>
                  Archive this draw
                </button>
              </>
            ) : (
              <button className="btn btn-quiet" onClick={() => handleActivate(selected)} disabled={isLoading}>
                Make active
              </button>
            )}
            <button className="btn btn-danger" onClick={() => handleDelete(selected)} disabled={isLoading}>
              Delete
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- List ----------
  return (
    <Shell>
      <div className="stage stage-wide">
        <h1 className="title">Secret Santa admin</h1>
        <p className="lead">
          One draw is active at a time. Nobody, including you, can see who got whom.
        </p>
        {notices}

        <section className="section" aria-labelledby="draws-title">
          <div className="section-head">
            <h2 id="draws-title" className="section-title">Draws</h2>
            <button className="btn btn-primary btn-small" onClick={() => go({ kind: "new" })} disabled={hasActive}>
              New draw
            </button>
          </div>
          {hasActive && (
            <p className="fine" style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}>
              To start a new draw, archive the active one first.
            </p>
          )}

          {!isLoadingDraws && draws.length === 0 && (
            <p className="fine">No draws yet. Create one to get everyone&rsquo;s links.</p>
          )}

          <ul className="draw-list">
            {draws.map((draw) => {
              const active = draw.status === "active";
              return (
                <li key={draw.id}>
                  <button className={`draw-row${active ? " is-active" : ""}`} onClick={() => go({ kind: "draw", id: draw.id })}>
                    <span className="draw-row-top">
                      <span className="draw-row-date">{formatDate(draw.createdAt)}</span>
                      <span className={`pill${active ? " pill-active" : ""}`}>{active ? "Active" : "Archived"}</span>
                    </span>
                    <span className="draw-row-people">{draw.participants.map((p) => p.name).join(", ")}</span>
                    <span className="draw-row-meta">
                      {openedCount(draw)} of {draw.participants.length} opened their link. {draw.budgetMessage}.
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
