"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import Decode from "@/components/Decode";

interface Result {
  assignedName: string;
  budgetMessage: string;
  eventDetails: string;
}

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "sealed"; participantName: string; busy: boolean; error?: string }
  | { kind: "open"; participantName: string; result: Result; animate: boolean };

export default function RevealPage() {
  const params = useParams();
  const participantId = params.id as string;

  const [view, setView] = useState<View>({ kind: "loading" });
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/reveal/${participantId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (data.hasRevealed) {
          setView({
            kind: "open",
            participantName: data.participantName,
            result: data,
            animate: false,
          });
        } else {
          setView({ kind: "sealed", participantName: data.participantName, busy: false });
        }
      } catch (err: any) {
        setView({
          kind: "error",
          message: err.message || "Your link couldn't be loaded. Reload the page to try again.",
        });
      }
    };

    load();
  }, [participantId]);

  const handleReveal = async () => {
    if (view.kind !== "sealed") return;
    const { participantName } = view;
    setView({ kind: "sealed", participantName, busy: true });

    try {
      const response = await fetch(`/api/reveal/${participantId}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setView({ kind: "open", participantName, result: data, animate: true });
    } catch (err: any) {
      setView({
        kind: "sealed",
        participantName,
        busy: false,
        error: err.message || "The reveal didn't go through. Try again.",
      });
    }
  };

  const firstName = (name: string) => name.trim().split(/\s+/)[0];

  return (
    <Shell flare={view.kind === "open" && landed}>
      <div className="stage" aria-live="polite">
        {view.kind === "loading" && <p className="greeting">Opening your link</p>}

        {view.kind === "error" && (
          <>
            <h1 className="title">This link doesn&rsquo;t work</h1>
            <p className="lead">{view.message}</p>
          </>
        )}

        {view.kind === "sealed" && (
          <>
            <p className="greeting">Hi {firstName(view.participantName)}. You&rsquo;re buying a gift for</p>
            <div className="slot">
              <button className="slab" onClick={handleReveal} disabled={view.busy}>
                {view.busy ? (
                  "Revealing"
                ) : (
                  <>
                    <span className="slab-click">Click to reveal</span>
                    <span className="slab-tap">Tap to reveal</span>
                    <span className="slab-warning">Check that nobody can see your screen first</span>
                  </>
                )}
              </button>
            </div>

            {view.error && <p className="notice">{view.error}</p>}

            <p className="fine">
              Your person stays the same every time you open this link.
            </p>
          </>
        )}

        {view.kind === "open" && (
          <>
            <p className="greeting">{firstName(view.participantName)}, you&rsquo;re buying a gift for</p>
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
                <dt>When and where</dt>
                <dd>{view.result.eventDetails}</dd>
              </div>
            </dl>

            <p className={`fine fade${landed ? " shown" : ""}`} style={{ marginTop: "2rem" }}>
              Keep it to yourself until the gifts are opened.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
