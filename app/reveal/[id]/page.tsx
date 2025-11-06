"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ChristmasLayout from "@/components/ChristmasLayout";

export default function RevealPage() {
  const params = useParams();
  const participantId = params.id as string;

  const [revealed, setRevealed] = useState(false);
  const [assignedName, setAssignedName] = useState("");
  const [budgetMessage, setBudgetMessage] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Check on load if already revealed
  useEffect(() => {
    const checkIfRevealed = async () => {
      try {
        const response = await fetch(`/api/reveal/${participantId}`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load assignment");
        }

        const data = await response.json();

        // If the participant has already revealed, show the result
        if (data.alreadyRevealed || data.assignedName) {
          setAssignedName(data.assignedName);
          setBudgetMessage(data.budgetMessage);
          setEventDetails(data.eventDetails);
          setParticipantName(data.participantName);
          setRevealed(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    checkIfRevealed();
  }, [participantId]);

  const handleReveal = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/reveal/${participantId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reveal assignment");
      }

      const data = await response.json();
      setAssignedName(data.assignedName);
      setBudgetMessage(data.budgetMessage);
      setEventDetails(data.eventDetails);
      setParticipantName(data.participantName);
      setRevealed(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChristmasLayout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 border-4 border-green-500/20">
          {isLoading && !revealed ? (
            <div className="text-center">
              <div className="text-7xl mb-6 animate-bounce">🎁</div>
              <h1 className="text-2xl font-bold mb-4 text-gray-700 dark:text-gray-300">
                Loading your Secret Santa...
              </h1>
              <div className="animate-pulse text-gray-500 dark:text-gray-400">
                ✨ Please wait ✨
              </div>
            </div>
          ) : !revealed ? (
            <div className="text-center">
              <div className="text-7xl mb-6 animate-float">🎁</div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
                🎄 Secret Santa 🎄
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                ✨ Ready to find out who you're buying a gift for? ✨
              </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleReveal}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-green-500 text-white font-semibold text-lg rounded-lg hover:from-red-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              🎅 Reveal My Secret Santa
            </button>

            <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              Click to reveal your assignment!
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-6 animate-bounce">🎉</div>
            <h1 className="text-2xl font-bold mb-2">
              {participantName}, you're buying a gift for...
            </h1>

            <div className="my-8 p-6 bg-gradient-to-r from-red-100 to-green-100 dark:from-red-900 dark:to-green-900 rounded-lg">
              <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                {assignedName}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                <div className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  📅 Event Details
                </div>
                <div className="text-purple-800 dark:text-purple-200 whitespace-pre-line">
                  {eventDetails}
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💰 Budget Reminder
                </div>
                <div className="text-blue-800 dark:text-blue-200">
                  {budgetMessage}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>🤫 Remember to keep it a secret!</p>
              <p>🎁 Happy shopping!</p>
            </div>
          </div>
          )}
        </div>
      </div>
    </ChristmasLayout>
  );
}
