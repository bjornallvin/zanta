"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import Decode from "@/components/Decode";
import Countdown from "@/components/Countdown";

interface Result {
  assignedName: string;
  budgetMessage: string;
  eventDetails: string;
  eventDate: string | null;
  eventTime: string | null;
}

type View =
  | { kind: "loading" }
  | { kind: "error"; title: string; message: string }
  | {
      kind: "sealed";
      participantName: string;
      eventDate: string | null;
      eventTime: string | null;
      busy: boolean;
      error?: string;
    }
  | { kind: "open"; participantName: string; result: Result; animate: boolean };

export default function RevealPage() {
  const params = useParams();
  const participantId = params.id as string;

  const [view, setView] = useState<View>({ kind: "loading" });
  const [landed, setLanded] = useState(false);

  const closed: View = {
    kind: "error",
    title: "Dragningen är stängd",
    message: "Länken hör till en Secret Santa-dragning som har arkiverats.",
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/reveal/${participantId}`);
        const data = await response.json();
        if (response.status === 410) return setView(closed);
        if (!response.ok) throw new Error(data.error);

        if (data.hasRevealed) {
          setView({
            kind: "open",
            participantName: data.participantName,
            result: data,
            animate: false,
          });
        } else {
          setView({
            kind: "sealed",
            participantName: data.participantName,
            eventDate: data.eventDate ?? null,
            eventTime: data.eventTime ?? null,
            busy: false,
          });
        }
      } catch (err: any) {
        setView({
          kind: "error",
          title: "Länken fungerar inte",
          message: err.message || "Det gick inte att öppna länken. Ladda om sidan och försök igen.",
        });
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  const handleReveal = async () => {
    if (view.kind !== "sealed") return;
    const { participantName, eventDate, eventTime } = view;
    setView({ kind: "sealed", participantName, eventDate, eventTime, busy: true });

    try {
      const response = await fetch(`/api/reveal/${participantId}`, { method: "POST" });
      const data = await response.json();
      if (response.status === 410) return setView(closed);
      if (!response.ok) throw new Error(data.error);

      setView({ kind: "open", participantName, result: data, animate: true });
    } catch (err: any) {
      setView({
        kind: "sealed",
        participantName,
        eventDate,
        eventTime,
        busy: false,
        error: err.message || "Det gick inte att visa. Försök igen.",
      });
    }
  };

  const firstName = (name: string) => name.trim().split(/\s+/)[0];

  const when =
    view.kind === "sealed" ? view : view.kind === "open" ? view.result : null;
  const countdown = when?.eventDate ? (
    <Countdown eventDate={when.eventDate} eventTime={when.eventTime} />
  ) : null;

  return (
    <Shell flare={view.kind === "open" && landed} headerAside={countdown}>
      <div className="stage" aria-live="polite">
        {view.kind === "loading" && <p className="greeting">Öppnar din länk</p>}

        {view.kind === "error" && (
          <>
            <h1 className="title">{view.title}</h1>
            <p className="lead">{view.message}</p>
          </>
        )}

        {view.kind === "sealed" && (
          <>
            <p className="greeting">Hej {firstName(view.participantName)}! Du ska köpa julklapp till</p>
            <div className="slot">
              <button className="slab" onClick={handleReveal} disabled={view.busy}>
                {view.busy ? (
                  "Visar"
                ) : (
                  <>
                    <span className="slab-click">Klicka för att se</span>
                    <span className="slab-tap">Tryck för att se</span>
                    <span className="slab-warning">Se till att ingen kan se din skärm först</span>
                  </>
                )}
              </button>
            </div>

            {view.error && <p className="notice">{view.error}</p>}

            <p className="fine">
              Du får samma person varje gång du öppnar länken.
            </p>
          </>
        )}

        {view.kind === "open" && (
          <>
            <p className="greeting">{firstName(view.participantName)}, du ska köpa julklapp till</p>
            <div className="slot">
              <h1 className={`name${landed ? " landed" : ""}`}>
                <Decode
                  text={view.result.assignedName}
                  animate={view.animate}
                  onDone={() => setLanded(true)}
                />
              </h1>
              <span className="underline" />
            </div>

            <dl className={`details${landed ? " shown" : ""}`}>
              <div>
                <dt>Budget</dt>
                <dd>{view.result.budgetMessage}</dd>
              </div>
              <div>
                <dt>När och var</dt>
                <dd>{view.result.eventDetails}</dd>
              </div>
            </dl>

            <p className={`fine fade${landed ? " shown" : ""}`} style={{ marginTop: "1.25rem" }}>
              Håll det hemligt tills julklapparna öppnas.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
