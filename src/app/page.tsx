"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { BrandMood, LogoType, TypographyStyle, UsageLocation } from "@/types/brandBrief";

const MoodBoardScreen = dynamic(() => import("@/components/screens/MoodBoardScreen"), { ssr: false });
const VisualDirectionScreen = dynamic(() => import("@/components/screens/VisualDirectionScreen"), { ssr: false });
const UsageScreen = dynamic(() => import("@/components/screens/UsageScreen"), { ssr: false });

type ScreenType = "mood" | "visual_direction" | "usage";

type Message = {
  role: "assistant" | "user" | "screen" | "brief";
  content: string;
  streaming?: boolean;
  screenType?: ScreenType;
  screenDone?: boolean;
  briefToken?: string;
};

type Phase = "name" | "interview" | "done";

type Session = {
  id: string;
  client_email: string;
  client_name: string | null;
  status: string;
  current_stage: string;
  readiness_level: string;
  readiness_score: number;
};

const greeting: Message = {
  role: "assistant",
  content: "Вітаю. Я допоможу вам підготувати бриф для розробки логотипу або фірмового стилю.\n\nЯк до вас звертатись?",
};

// Renders assistant message text with basic markdown:
// --- becomes a divider, *italic*, **bold**, newlines become <br>
function MessageBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === "---") {
          return <hr key={i} className="msg-divider" />;
        }
        const rendered = renderInline(line);
        return (
          <span key={i}>
            {rendered}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) parts.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={key++}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function getPlaceholder(phase: Phase) {
  if (phase === "name") return "Як до вас звертатись?";
  if (phase === "done") return "";
  return "Напишіть відповідь... (або «готово» щоб завершити)";
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("name");
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [briefToken, setBriefToken] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shownScreens = useRef<Set<ScreenType>>(new Set());
  // Screen queued after AI message — injected on next user submit
  const pendingScreenRef = useRef<ScreenType | null>(null);
  // User answer stored when a screen intercepts submit
  const pendingUserAnswerRef = useRef<string>("");

  // Queue a screen to show before the user's next API message
  function queueScreen(type: ScreenType) {
    if (shownScreens.current.has(type)) return;
    if (!pendingScreenRef.current) pendingScreenRef.current = type;
  }

  // Immediately inject a screen (used only when restoring from history)
  function maybeInjectScreen(type: ScreenType) {
    if (shownScreens.current.has(type)) return;
    shownScreens.current.add(type);
    setMessages(cur => [...cur, { role: "screen", content: "", screenType: type }]);
  }

  // Resume only when coming back via "← Повернутися до редагування" (?resume=sessionId)
  useEffect(() => {
    const sessionId = searchParams.get("resume");
    if (!sessionId) return; // clean visit → start fresh

    setIsLoading(true);

    fetch("/api/sessions/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`resume ${r.status}`);
        return r.json();
      })
      .then((data: {
        session?: Session;
        messages?: Message[];
        assistantMessage?: string;
        briefToken?: string | null;
        error?: string;
      }) => {
        if (data.error || !data.session) {
          console.warn("[resume] failed:", data.error);
          return;
        }
        setSession(data.session);
        setPhase("interview");
        const resumeMessages: Message[] = [
          ...(data.messages ?? []),
          ...(data.briefToken ? [{ role: "brief" as const, content: "", briefToken: data.briefToken }] : []),
          { role: "assistant", content: data.assistantMessage ?? "Продовжуємо." },
        ];
        setMessages(resumeMessages);
        if (data.briefToken) setBriefToken(data.briefToken);
        // Clean URL so refresh doesn't re-resume
        router.replace("/", { scroll: false });
      })
      .catch((err) => {
        console.warn("[resume] fetch error:", err);
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Textarea auto-resize
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  // Submit on Enter (Shift+Enter = newline)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (blob.size < 1000) return;

      setIsTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", blob);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string };
        if (data.text) setInput((prev) => (prev ? prev + " " + data.text : data.text!));
      } catch {
        // silent fail — user can type manually
      } finally {
        setIsTranscribing(false);
      }
    };

    recorder.start();
    setIsRecording(true);
  }, [isRecording]);

  const DEV_SCREENS: Record<string, ScreenType> = {
    "///mood":   "mood",
    "///visual": "visual_direction",
    "///usage":  "usage",
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value || isLoading || phase === "done") return;

    // Dev shortcut: inject screen directly without API call
    if (phase === "interview" && DEV_SCREENS[value]) {
      setInput("");
      maybeInjectScreen(DEV_SCREENS[value]);
      return;
    }

    setInput("");
    const textarea = event.currentTarget.querySelector("textarea");
    if (textarea) textarea.style.height = "auto";

    setMessages((cur) => [...cur, { role: "user", content: value }]);
    setIsLoading(true);

    try {
      if (phase === "name") {
        const res = await fetch("/api/sessions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value }),
        });
        const text = await res.text();
        if (!text) throw new Error(`Empty response (status ${res.status})`);
        let data: {
          session: Session;
          assistantMessage: string;
          hintMessage?: string;
          messages?: Message[];
          isReturning?: boolean;
          error?: string;
        };
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Bad JSON (${res.status}): ${text.slice(0, 80)}`);
        }
        if (!res.ok) throw new Error(data.error ?? "START_FAILED");
        localStorage.setItem("bc_session", JSON.stringify({ id: data.session.id, name: data.session.client_name }));
        setSession(data.session);
        setPhase("interview");
        if (data.isReturning && data.messages?.length) {
          setMessages((cur) => [...cur, ...data.messages!, { role: "assistant", content: data.assistantMessage }]);
        } else {
          setMessages((cur) => [
            ...cur,
            { role: "assistant", content: data.hintMessage! },
            { role: "assistant", content: data.assistantMessage },
          ]);
        }
        return;
      }

      if (phase === "interview" && session) {
        // If a screen is queued — show it now instead of calling API.
        // User's answer is stored; when they complete the screen, both are sent together.
        if (pendingScreenRef.current) {
          const screenType = pendingScreenRef.current;
          pendingScreenRef.current = null;
          pendingUserAnswerRef.current = value;
          shownScreens.current.add(screenType);
          setMessages(cur => [...cur, { role: "screen", content: "", screenType }]);
          setIsLoading(false);
          return;
        }
        await streamMessage(session.id, value);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      pushMessage(`Помилка: ${msg}. Спробуйте ще раз.`);
    } finally {
      setIsLoading(false);
    }
  }

  async function streamMessage(sessionId: string, content: string) {
    const res = await fetch(`/api/sessions/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "STREAM_FAILED");
    }

    // Add empty streaming message
    setMessages((cur) => [...cur, { role: "assistant", content: "", streaming: true }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Check for metadata frame
      const metaIdx = buffer.indexOf("__META__");
      if (metaIdx !== -1) {
        const textPart = buffer.slice(0, metaIdx).replace(/^\n\n/, "");
        const metaStr = buffer.slice(metaIdx + 8);

        // Finalize the streaming message
        setMessages((cur) => {
          const next = [...cur];
          const last = next[next.length - 1];
          if (last?.streaming) {
            next[next.length - 1] = { role: "assistant", content: last.content + textPart };
          }
          return next;
        });

        try {
          const meta = JSON.parse(metaStr) as {
            session?: Session;
            briefToken?: string | null;
            layerComplete?: boolean;
            layer?: number;
            error?: string;
          };
          if (meta.error) {
            setMessages((cur) => {
              const next = [...cur];
              const last = next[next.length - 1];
              if (last?.streaming) {
                next[next.length - 1] = { role: "assistant", content: `Помилка: ${meta.error}. Спробуйте ще раз.` };
              }
              return next;
            });
          }
          if (meta.session) setSession(meta.session);
          if (meta.briefToken) {
            setBriefToken(meta.briefToken);
            setMessages(cur => [...cur, { role: "brief", content: "", briefToken: meta.briefToken! }]);
            try {
              const cur2 = localStorage.getItem("bc_session");
              const parsed = cur2 ? JSON.parse(cur2) : {};
              localStorage.setItem("bc_session", JSON.stringify({ ...parsed, briefToken: meta.briefToken }));
            } catch { /* ignore */ }
          }
          // Queue interactive screens — injected on the user's NEXT submit, not after AI message
          const score = meta.session?.readiness_score ?? 0;
          if (score >= 23 || (meta.layerComplete && meta.layer === 1)) queueScreen("mood");
          if (score >= 38 || (meta.layer === 2 && meta.layerComplete)) queueScreen("visual_direction");
          if (score >= 56 || meta.layer === 3) queueScreen("usage");
        } catch {
          // Malformed meta — ignore
        }

        // Sync to GitHub from client — more reliable than server-side fire-and-forget
        fetch("/api/sessions/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});

        break;
      }

      // Capture buffer value NOW before React runs the updater asynchronously.
      // Closures capture by reference — by the time React calls the updater,
      // buffer would already be "" if we don't snapshot it here.
      const chunk = buffer;
      buffer = "";
      setMessages((cur) => {
        const next = [...cur];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = {
            role: "assistant",
            content: last.content + chunk,
            streaming: true,
          };
        }
        return next;
      });
    }
  }

  function pushMessage(content: string) {
    setMessages((cur) => [...cur, { role: "assistant", content }]);
  }

  // Called when a screen is completed — mark it done and submit data as user message
  function handleScreenComplete(screenType: ScreenType, formatted: string) {
    setMessages(cur =>
      cur.map(m =>
        m.role === "screen" && m.screenType === screenType && !m.screenDone
          ? { ...m, screenDone: true }
          : m
      )
    );
    if (session) {
      setIsLoading(true);
      // If user's answer was held for the screen, combine both into one API call
      const held = pendingUserAnswerRef.current;
      pendingUserAnswerRef.current = "";
      const payload = held ? `${held}\n\n---\n${formatted}` : formatted;
      setMessages(cur => [...cur, { role: "user", content: formatted }]);
      streamMessage(session.id, payload).finally(() => setIsLoading(false));
    }
  }

  const submitLabel = phase === "name" ? "Почати" : "Надіслати";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <h1 className="brand-title">Brand Compass</h1>
            <p className="brand-subtitle">AI-інтерв'ю для бренд-брифу</p>
          </div>
          {session && phase === "interview" && (
            <div className="readiness-pill">
              <span className="readiness-label">Готовність брифу</span>
              {session.readiness_score}/100
            </div>
          )}
        </div>
      </header>

      <section className="chat-shell">
        <div className="messages">
          {messages.map((msg, i) => {
            if (msg.role === "screen") {
              if (msg.screenDone) {
                return (
                  <div key={i} className="screen-done-badge">
                    {msg.screenType === "mood" && "Настрій бренду — збережено"}
                    {msg.screenType === "visual_direction" && "Візуальний напрямок — збережено"}
                    {msg.screenType === "usage" && "Розміщення — збережено"}
                  </div>
                );
              }
              return (
                <div key={i} className="screen-message-wrap">
                  {msg.screenType === "mood" && (
                    <MoodBoardScreen
                      onComplete={(_, formatted) => handleScreenComplete("mood", formatted)}
                    />
                  )}
                  {msg.screenType === "visual_direction" && (
                    <VisualDirectionScreen
                      onComplete={(logoType, typography, formatted) => {
                        void logoType; void typography;
                        handleScreenComplete("visual_direction", formatted);
                      }}
                    />
                  )}
                  {msg.screenType === "usage" && (
                    <UsageScreen
                      onComplete={(_, formatted) => handleScreenComplete("usage", formatted)}
                    />
                  )}
                </div>
              );
            }
            if (msg.role === "brief") {
              return (
                <div key={i} className="message-row assistant">
                  <div className="message-bubble assistant brief-ready-bubble">
                    <p>Бриф готовий. Ви можете переглянути і підтвердити його за посиланням:</p>
                    <a
                      href={`/brief/${msg.briefToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brief-link"
                    >
                      Переглянути бриф →
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className={`message-bubble ${msg.role}${msg.streaming ? " streaming" : ""}`}>
                  <MessageBody text={msg.content} />
                  {msg.streaming && <span className="typing-cursor" />}
                </div>
              </div>
            );
          })}

          {isLoading && !messages[messages.length - 1]?.streaming && (
            <div className="message-row assistant">
              <div className="message-bubble assistant">
                <span className="typing-dots">
                  <span /><span /><span />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {(phase === "name" || phase === "interview") && (
          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(phase)}
              className="chat-input"
              disabled={isLoading || isRecording || isTranscribing}
            />
            {phase === "interview" && (
              <button
                type="button"
                className={`mic-button${isRecording ? " recording" : ""}${isTranscribing ? " transcribing" : ""}`}
                onClick={toggleRecording}
                disabled={isLoading || isTranscribing}
                title={isRecording ? "Зупинити запис" : "Говорити"}
              >
                {isTranscribing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" className="spin-path"/>
                  </svg>
                ) : isRecording ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            )}
            <button
              type="submit"
              className="primary-button"
              disabled={isLoading || isRecording || isTranscribing || !input.trim()}
            >
              {submitLabel}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <React.Suspense>
      <HomePageInner />
    </React.Suspense>
  );
}
