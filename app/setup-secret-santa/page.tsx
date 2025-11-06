"use client";

import { useState, useEffect } from "react";
import ChristmasLayout from "@/components/ChristmasLayout";

interface GeneratedLink {
  name: string;
  url: string;
}

interface Participant {
  id: string;
  name: string;
  hasRevealed: boolean;
}

interface CurrentEvent {
  participants: Participant[];
  budgetMessage: string;
  eventDetails: string;
  createdAt: number;
}

export default function SetupPage() {
  const [participantNames, setParticipantNames] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [budgetMessage, setBudgetMessage] = useState(
    "Suggested budget: 200 SEK"
  );
  const [eventDetails, setEventDetails] = useState(
    "Julbord on November 28th at 18:15\nVenue: Kristinehovs Malmgård, Kristinehovsgatan 2, 117 29 Stockholm\nPresents to be exchanged there!"
  );
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [error, setError] = useState("");

  // Load current event on mount
  useEffect(() => {
    const loadCurrentEvent = async () => {
      try {
        const response = await fetch("/api/event-status");
        if (response.ok) {
          const data = await response.json();
          if (data.event) {
            setCurrentEvent(data.event);
          }
        }
      } catch (err) {
        console.error("Failed to load current event:", err);
      } finally {
        setIsLoadingEvent(false);
      }
    };

    loadCurrentEvent();
  }, []);

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
      const newNames = participantNames.filter((_, i) => i !== index);
      setParticipantNames(newNames);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGeneratedLinks([]);

    // Validate
    const validNames = participantNames.filter((name) => name.trim() !== "");
    if (validNames.length < 2) {
      setError("Please enter at least 2 participants");
      return;
    }

    if (validNames.length % 2 !== 0) {
      setError("Please enter an even number of participants");
      return;
    }

    if (!budgetMessage.trim()) {
      setError("Please enter a budget message");
      return;
    }

    if (!eventDetails.trim()) {
      setError("Please enter event details");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      const links: GeneratedLink[] = data.participants.map((p: any) => ({
        name: p.name,
        url: `${baseUrl}/reveal/${p.id}`,
      }));

      setGeneratedLinks(links);
    } catch (err) {
      setError("Failed to create Secret Santa event. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllLinks = () => {
    const allLinks = generatedLinks
      .map((link) => `${link.name}: ${link.url}`)
      .join("\n\n");
    navigator.clipboard.writeText(allLinks);
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to delete the current event and start over? This cannot be undone!")) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reset event");
      }

      // Reset form state
      setGeneratedLinks([]);
      setCurrentEvent(null);
      setParticipantNames(["", "", "", "", "", ""]);
      setBudgetMessage("Suggested budget: 200 SEK");
      setEventDetails("Julbord on November 28th at 18:15\nVenue: Kristinehovs Malmgård, Kristinehovsgatan 2, 117 29 Stockholm\nPresents to be exchanged there!");
      alert("Event has been reset successfully!");
    } catch (err) {
      setError("Failed to reset event. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChristmasLayout>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 border-4 border-red-500/20">
            <div className="text-center mb-2">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-transparent animate-gradient">
                🎅 Secret Santa Setup 🎄
              </h1>
            </div>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8 text-lg">
              ✨ Create your magical Secret Santa event ✨
            </p>

            {/* Current Event Status */}
            {!isLoadingEvent && currentEvent && (
              <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-red-50 dark:from-green-950 dark:to-red-950 rounded-lg border-2 border-green-300 dark:border-green-700">
                <h2 className="text-2xl font-bold mb-4 text-center text-green-700 dark:text-green-300">
                  🎄 Current Event Status
                </h2>

                <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Created:</strong> {new Date(currentEvent.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Budget:</strong> {currentEvent.budgetMessage}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    <strong>Event:</strong> {currentEvent.eventDetails}
                  </p>
                </div>

                <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
                  Participants ({currentEvent.participants.filter(p => p.hasRevealed).length}/{currentEvent.participants.length} revealed):
                </h3>

                <div className="space-y-2">
                  {currentEvent.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        participant.hasRevealed
                          ? "bg-green-100 dark:bg-green-900 border-2 border-green-300 dark:border-green-700"
                          : "bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {participant.name}
                      </span>
                      <span className="text-sm">
                        {participant.hasRevealed ? "✅ Revealed" : "⏳ Waiting"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {!generatedLinks.length ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Participants
                </label>
                {participantNames.map((name, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      placeholder={`Participant ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700"
                    />
                    {participantNames.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addParticipant}
                  className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
                >
                  + Add another participant
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Budget Message
                </label>
                <input
                  type="text"
                  value={budgetMessage}
                  onChange={(e) => setBudgetMessage(e.target.value)}
                  placeholder="e.g., Suggested budget: $25-50"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Event Details
                </label>
                <textarea
                  value={eventDetails}
                  onChange={(e) => setEventDetails(e.target.value)}
                  placeholder="e.g., Julbord on November 28th - Presents to be exchanged there!"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-green-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Generate Secret Santa Links"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="w-full mt-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Everything
              </button>
            </form>
          ) : (
            <div>
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg">
                ✓ Secret Santa event created successfully!
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Share these links with participants:
                </h2>
                <button
                  onClick={copyAllLinks}
                  className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Copy All
                </button>
              </div>

              <div className="space-y-3">
                {generatedLinks.map((link, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-lg">{link.name}</span>
                      <button
                        onClick={() => copyToClipboard(link.url)}
                        className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        Copy Link
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 break-all">
                      {link.url}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                <strong>Important:</strong> Save these links! Each person needs
                their unique link to reveal their Secret Santa assignment.
              </div>

              <button
                onClick={handleReset}
                disabled={isLoading}
                className="mt-6 w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Another Event (Reset)
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </ChristmasLayout>
  );
}
