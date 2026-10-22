"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import DrawForm, { DrawFormValues } from "@/components/DrawForm";
import { eventStartMs, formatEventMoment } from "@/lib/dates";

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
  eventDate: string | null;
  eventTime: string | null;
  createdAt: number;
  archivedAt: number | null;
}

// Two views: the list of all draws, and one draw (or a new one)
type View = { kind: "list" } | { kind: "draw"; id: string } | { kind: "new" };

const NEW_DRAW: DrawFormValues = {
  eventDate: "",
  eventTime: "18:00",
  people: Array.from({ length: 6 }, () => ({ name: "" })),
  budgetMessage: "Runt 200 kr",
  eventDetails: "",
};
const PASSWORD_KEY = "zanta-admin-password";

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });

// The event date names a draw; older draws without one fall back to when they were created
const drawName = (draw: DrawSummary) =>
  draw.eventDate ? formatEventMoment(draw.eventDate, draw.eventTime) : `Skapad ${formatDate(draw.createdAt)}`;

const sortKey = (draw: DrawSummary) =>
  draw.eventDate ? eventStartMs(draw.eventDate, draw.eventTime) : draw.createdAt;

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
      lock("Fel lösenord. Försök igen.");
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
    if (!response.ok) throw new Error(data.error || "Det gick inte. Försök igen.");
    return data;
  };

  const loadDraws = async (pw: string) => {
    try {
      const response = await adminFetch("/api/event-status", pw);
      if (response.ok) {
        const data = await response.json();
        const all: DrawSummary[] = [...(data.active ? [data.active] : []), ...data.archived];
        setDraws(all.sort((a, b) => sortKey(b) - sortKey(a)));
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
      eventDate: values.eventDate,
      eventTime: values.eventTime,
      participantNames: values.people.map((p) => p.name),
      budgetMessage: values.budgetMessage,
      eventDetails: values.eventDetails,
    });
    await loadDraws(password);
    go({ kind: "draw", id: drawId });
    setMessage("Dragningen är skapad. Kopiera varje persons länk och skicka den till dem.");
  };

  const handleUpdate = async (draw: DrawSummary, values: DrawFormValues) => {
    // Same ids as before means only renames; anything else redraws everyone
    const peopleChanged =
      values.people.length !== draw.participants.length || values.people.some((p) => !p.id);
    const opened = openedCount(draw);
    if (draw.status === "active" && peopleChanged && opened > 0) {
      const ok = confirm(
        `${opened} ${opened === 1 ? "person har" : "personer har"} redan öppnat sin länk. ` +
          "Ändrar du personerna får alla en ny match, så de kommer att se en annan person. Spara ändå?"
      );
      if (!ok) return;
    }

    setMessage("");
    const { redrawn } = await post("/api/update-draw", { drawId: draw.id, ...values });
    await loadDraws(password);
    setMessage(
      redrawn ? "Dragningen är sparad. Personerna ändrades, så alla har fått en ny match." : "Dragningen är sparad."
    );
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
      setError(err instanceof Error ? err.message : "Det gick inte. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = (draw: DrawSummary) => {
    if (!confirm("Arkivera dragningen? Länkarna slutar fungera tills du gör den aktiv igen.")) return;
    changeDraw("/api/archive-draw", undefined, "Dragningen är arkiverad.", { kind: "draw", id: draw.id });
  };

  const handleActivate = (draw: DrawSummary) => {
    const question = draws.some((d) => d.status === "active")
      ? "Gör dragningen aktiv? Den nuvarande dragningen arkiveras och dess länkar slutar fungera."
      : "Gör dragningen aktiv? Länkarna börjar fungera igen.";
    if (!confirm(question)) return;
    changeDraw("/api/activate-draw", { drawId: draw.id }, "Dragningen är aktiv. Länkarna fungerar igen.", {
      kind: "draw",
      id: draw.id,
    });
  };

  const handleReset = (draw: DrawSummary) => {
    if (
      !confirm(
        "Återställ dragningen? Alla får en ny länk och en ny match. De gamla länkarna slutar fungera, så du måste skicka de nya länkarna till alla."
      )
    )
      return;
    changeDraw("/api/reset-draw", { drawId: draw.id }, "Dragningen är återställd. Skicka de nya länkarna till alla.", {
      kind: "draw",
      id: draw.id,
    });
  };

  const handleDelete = (draw: DrawSummary) => {
    if (!confirm("Radera dragningen för gott? Länkarna slutar fungera och den går inte att få tillbaka.")) return;
    changeDraw("/api/delete-draw", { drawId: draw.id }, "Dragningen är raderad.", { kind: "list" });
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
          <p className="lead">Ange adminlösenordet för att hantera dragningarna.</p>
          <form onSubmit={handleUnlock} style={{ marginTop: "2.5rem", maxWidth: "24rem" }}>
            <label className="field">
              <span className="field-label">Lösenord</span>
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
              {isLoadingDraws ? "Kontrollerar" : "Lås upp"}
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
      Tillbaka till alla dragningar
    </button>
  );

  // ---------- New draw ----------
  if (view.kind === "new") {
    return (
      <Shell>
        <div className="stage stage-wide">
          {back}
          <h1 className="title">Ny dragning</h1>
          {notices}
          <div className="section" style={{ marginTop: "2rem" }}>
            <DrawForm
              initial={NEW_DRAW}
              submitLabel="Skapa dragningen"
              busyLabel="Skapar dragningen"
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
            <h1 className="title">{drawName(selected)}</h1>
            <span className={`pill${active ? " pill-active" : ""}`}>{active ? "Aktiv" : "Arkiverad"}</span>
          </div>
          <p className="fine" style={{ marginTop: "0.75rem" }}>
            {active
              ? "Länkarna fungerar. Skicka varje person sin egen länk."
              : `Länkarna är stängda${selected.archivedAt ? ` sedan ${formatDate(selected.archivedAt)}` : ""}. Gör dragningen aktiv för att öppna dem igen.`}
          </p>
          {notices}

          {active && (
            <section className="section" aria-labelledby="links-title">
              <div className="section-head">
                <h2 id="links-title" className="section-title">Länkar</h2>
                <p className="fine">
                  {opened} av {total} har öppnat sin länk
                </p>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={opened}
                aria-label="Öppnade länkar"
              >
                <span style={{ width: `${total ? (opened / total) * 100 : 0}%` }} />
              </div>

              <div className="links-head">
                <p className="fine">Varje länk hör till en person. Skicka den bara till hen.</p>
                <button
                  className="btn btn-quiet"
                  onClick={() =>
                    copy("all", selected.participants.map((p) => `${p.name}: ${linkFor(p)}`).join("\n"))
                  }
                >
                  {copied === "all" ? "Kopierat" : "Kopiera alla länkar"}
                </button>
              </div>
              <ul className="links">
                {selected.participants.map((p) => (
                  <li key={p.id}>
                    <span className={`who${p.hasRevealed ? "" : " waiting"}`}>
                      <span className={`dot${p.hasRevealed ? " on" : ""}`} />
                      {p.name}
                      <span className="sr-only">
                        {p.hasRevealed ? " har öppnat sin länk" : " har inte öppnat sin länk än"}
                      </span>
                    </span>
                    <button className="btn btn-quiet" onClick={() => copy(p.id, linkFor(p))}>
                      {copied === p.id ? "Kopierat" : "Kopiera länk"}
                    </button>
                    <span className="url">{linkFor(p)}</span>
                  </li>
                ))}
              </ul>

            </section>
          )}

          <section className="section" aria-labelledby="edit-title">
            <h2 id="edit-title" className="section-title" style={{ marginBottom: "1.5rem" }}>
              Personer och detaljer
            </h2>
            <DrawForm
              key={`${selected.id}-${selected.eventDate}-${selected.eventTime}-${selected.budgetMessage}-${selected.eventDetails}-${selected.participants.map((p) => p.id + p.name).join()}`}
              initial={{
                people: selected.participants.map((p) => ({ id: p.id, name: p.name })),
                eventDate: selected.eventDate ?? "",
                eventTime: selected.eventTime ?? "",
                budgetMessage: selected.budgetMessage,
                eventDetails: selected.eventDetails,
              }}
              submitLabel="Spara ändringar"
              busyLabel="Sparar"
              note="Byter du namn behåller alla sin match. Lägger du till eller tar bort personer blir det en ny dragning för alla: länkarna är desamma, men vem som köper till vem ändras."
              onSubmit={(values) => handleUpdate(selected, values)}
            />
          </section>

          <div className="actions draw-actions">
            {active ? (
              <>
                <button className="btn btn-quiet" onClick={() => handleReset(selected)} disabled={isLoading}>
                  Återställ länkar
                </button>
                <button className="btn btn-quiet" onClick={() => handleArchive(selected)} disabled={isLoading}>
                  Arkivera dragningen
                </button>
              </>
            ) : (
              <button className="btn btn-quiet" onClick={() => handleActivate(selected)} disabled={isLoading}>
                Gör aktiv
              </button>
            )}
            <button className="btn btn-danger" onClick={() => handleDelete(selected)} disabled={isLoading}>
              Radera
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
          En dragning är aktiv åt gången. Ingen, inte ens du, kan se vem som fick vem.
        </p>
        {notices}

        <section className="section" aria-labelledby="draws-title">
          <div className="section-head">
            <h2 id="draws-title" className="section-title">Dragningar</h2>
            <button className="btn btn-primary btn-small" onClick={() => go({ kind: "new" })} disabled={hasActive}>
              Ny dragning
            </button>
          </div>
          {hasActive && (
            <p className="fine" style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}>
              Arkivera den aktiva dragningen för att starta en ny.
            </p>
          )}

          {!isLoadingDraws && draws.length === 0 && (
            <p className="fine">Inga dragningar än. Skapa en för att få allas länkar.</p>
          )}

          <ul className="draw-list">
            {draws.map((draw) => {
              const active = draw.status === "active";
              return (
                <li key={draw.id}>
                  <button className={`draw-row${active ? " is-active" : ""}`} onClick={() => go({ kind: "draw", id: draw.id })}>
                    <span className="draw-row-top">
                      <span className="draw-row-date">{drawName(draw)}</span>
                      <span className={`pill${active ? " pill-active" : ""}`}>{active ? "Aktiv" : "Arkiverad"}</span>
                    </span>
                    <span className="draw-row-people">{draw.participants.map((p) => p.name).join(", ")}</span>
                    <span className="draw-row-meta">
                      {openedCount(draw)} av {draw.participants.length} har öppnat sin länk. {draw.budgetMessage}
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
