import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, Copy, Heart,
  Lightbulb, LoaderCircle, MessageCircle, Mic2, RotateCcw, Search, Sparkles,
  WandSparkles, X,
} from "lucide-react";
import { api, type GenerateInput, type Length, type Message, type Preferences, type Tone } from "./api";
import { scenarios, type Guide } from "./data";

type Page = "write" | "guides" | "practice" | "saved";
const defaultPreferences: Preferences = { mode: "funny", length: "medium", directness: 55 };

const scenariosPresets = [
  "Cancel plans", "Say no to a request", "Decline an invitation", "Reply after a long silence",
  "Set a personal boundary", "Give constructive feedback", "Ask for help", "Explain a missed deadline", "Something else",
];
const tones: { id: Tone; title: string; hint: string; symbol: string }[] = [
  { id: "funny", title: "Funny", hint: "A little levity", symbol: "✳" },
  { id: "professional", title: "Professional", hint: "Polished & clear", symbol: "↗" },
  { id: "direct", title: "Brutally honest", hint: "But respectful", symbol: "◒" },
];
const toneName: Record<Tone, string> = { funny: "Funny", professional: "Professional", direct: "Brutally honest, respectfully" };

function App() {
  const [page, setPage] = useState<Page>("write");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [scenario, setScenario] = useState(scenariosPresets[0]!);
  const [customScenario, setCustomScenario] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<GenerateInput["channel"]>("text");
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [active, setActive] = useState<Message | null>(null);
  const [draft, setDraft] = useState("");
  const [guides, setGuides] = useState<(Guide & { bookmarked: boolean })[]>([]);
  const [allGuides, setAllGuides] = useState<(Guide & { bookmarked: boolean })[]>([]);
  const directnessRef = useRef(55);
  const [guideSearch, setGuideSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [simulatorId, setSimulatorId] = useState(scenarios[0]!.id);
  const [simNode, setSimNode] = useState(scenarios[0]!.start);
  const [simPath, setSimPath] = useState<string[]>([scenarios[0]!.start]);

  const simulator = scenarios.find((item) => item.id === simulatorId)!;
  const currentNode = simulator.nodes[simNode]!;

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      try {
        const data = await api.bootstrap();
        const guideRows = await api.getGuides("");
        if (cancelled) return;
        setMessages(data.messages);
        setSavedMessages(data.savedMessages);
        setPreferences({
          mode: data.preferences.mode ?? "funny",
          length: data.preferences.length ?? "medium",
          directness: data.preferences.directness ?? 55,
        });
        setAiEnabled(data.aiEnabled);
        directnessRef.current = data.preferences.directness ?? 55;
        setGuides(guideRows);
        setAllGuides(guideRows);
        setActive(data.messages[0] ?? null);
        setDraft(data.messages[0]?.text ?? "");
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Couldn't load your workspace.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadWorkspace();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      api.getGuides(guideSearch)
        .then(setGuides)
        .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Couldn't search guides."));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [guideSearch, loading]);

  useEffect(() => {
    if (loading || preferences.directness === directnessRef.current) return;
    const timer = window.setTimeout(() => {
      directnessRef.current = preferences.directness;
      api.savePreferences(preferences).catch(() => setNotice("Couldn't save your preferences."));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [preferences, loading]);

  async function savePreferences(next: Preferences) {
    setPreferences(next);
    try {
      await api.savePreferences(next);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save your preferences.");
    }
  }

  async function generate() {
    if (active && draft !== active.text && !window.confirm("Replace your unsaved edits with a new version?")) return;
    const chosen = scenario === "Something else" ? customScenario.trim() : scenario.toLowerCase();
    if (scenario === "Something else" && chosen.length < 2) {
      setNotice("Add a few words about the situation first.");
      return;
    }
    setGenerating(true);
    try {
      const result = await api.generate({
        ...preferences,
        scenario: chosen,
        recipient: recipient.trim() || "someone",
        channel,
        context: context.trim(),
      });
      setMessages((old) => [result, ...old.filter((message) => message.id !== result.id)]);
      setActive(result);
      setDraft(result.text);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't make a message.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice("Clipboard access isn't available. Select the message and copy it instead.");
    }
  }

  async function saveDraft() {
    if (!active) return;
    try {
      const updated = draft === active.text ? active : await api.updateMessage(active.id, draft);
      const saved = !updated.savedAt;
      await api.saveMessage(updated.id, saved);
      const next = { ...updated, savedAt: saved ? new Date().toISOString() : null };
      setActive(next);
      setDraft(next.text);
      setMessages((old) => old.map((message) => message.id === next.id ? next : message));
      setSavedMessages((old) => saved
        ? [next, ...old.filter((message) => message.id !== next.id)]
        : old.filter((message) => message.id !== next.id));
      setNotice(saved ? "Saved for later." : "Removed from saved messages.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save this message.");
    }
  }

  async function persistEdit() {
    if (!active || draft === active.text) return;
    try {
      const updated = await api.updateMessage(active.id, draft);
      setActive(updated);
      setMessages((old) => old.map((message) => message.id === updated.id ? updated : message));
      if (updated.savedAt) {
        setSavedMessages((old) => old.map((message) => message.id === updated.id ? updated : message));
      }
      setNotice("Your edit is saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save your edit.");
    }
  }

  async function toggleBookmark(guide: Guide & { bookmarked: boolean }) {
    try {
      await api.bookmarkGuide(guide.id, !guide.bookmarked);
      const changed = { ...guide, bookmarked: !guide.bookmarked };
      setGuides((old) => old.map((item) => item.id === guide.id ? changed : item));
      setAllGuides((old) => old.map((item) => item.id === guide.id ? changed : item));
      setNotice(changed.bookmarked ? "Guide bookmarked." : "Bookmark removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't update that bookmark.");
    }
  }

  function openGuide(guide: Guide) {
    setScenario("Something else");
    setCustomScenario(guide.scenario);
    setPage("write");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeSimulator(id: string) {
    const links: Record<string, string> = {
      "say-no": "decline-request",
      feedback: "work-feedback",
      "missed-deadline": "missed-deadline",
      "ask-for-help": "work-feedback",
      "decline-invitation": "cancel-plans",
      boundary: "decline-request",
    };
    const next = scenarios.find((item) => item.id === (links[id] ?? id)) ?? scenarios[0]!;
    setSimulatorId(next.id);
    setSimNode(next.start);
    setSimPath([next.start]);
  }

  function moveSimulator(next: string) {
    setSimNode(next);
    setSimPath((old) => [...old, next]);
  }

  const bookmarkedGuides = useMemo(() => allGuides.filter((guide) => guide.bookmarked), [allGuides]);

  if (loading) {
    return <main className="loading-screen"><LoaderCircle size={26} className="spin" /><span>Setting the scene…</span></main>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#" className="wordmark" onClick={(event) => { event.preventDefault(); setPage("write"); }} aria-label="Awkwardly home">
          <span className="logo-stamp">a.</span><span>awkwardly</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <NavButton active={page === "write"} onClick={() => setPage("write")}>Message studio</NavButton>
          <NavButton active={page === "guides"} onClick={() => setPage("guides")}>Survival guides</NavButton>
          <NavButton active={page === "practice"} onClick={() => setPage("practice")}>Practice room</NavButton>
        </nav>
        <button className="saved-link" onClick={() => setPage("saved")} aria-label={`Saved messages, ${savedMessages.length}`}>
          <Bookmark size={16} strokeWidth={1.8} /><span>Saved</span><span className="saved-count">{savedMessages.length}</span>
        </button>
      </header>

      {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={15} /></button></div>}

      {page === "write" && (
        <main>
          <section className="hero">
            <div className="eyebrow"><span className="eyebrow-line" /> A little help with the hard bits</div>
            <div className="hero-row">
              <h1>For the things<br />you wish you knew<br /><em>what to say.</em></h1>
              <div className="hero-note">
                <span className="scribble" aria-hidden="true">✳</span>
                <p>Because “just be honest” is good advice. Knowing <i>how</i> is the tricky part.</p>
                <button className="text-link" onClick={() => setPage("guides")}>Get a little guidance <ArrowRight size={14} /></button>
              </div>
            </div>
          </section>

          <div className="workspace-grid">
            <section className="card composer-card" aria-labelledby="compose-title">
              <div className="card-heading">
                <div><span className="section-kicker">01 / SET THE SCENE</span><h2 id="compose-title">What's the situation?</h2></div>
                <span className="heading-icon lavender"><MessageCircle size={20} /></span>
              </div>
              <div className="field-grid">
                <label className="field-label">The awkward bit
                  <span className="select-wrap">
                    <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
                      {!scenariosPresets.includes(scenario) && <option value={scenario}>{scenario}</option>}
                      {scenariosPresets.map((item) => <option key={item}>{item}</option>)}
                    </select><ChevronDown size={16} />
                  </span>
                </label>
                {scenario === "Something else" && <label className="field-label">What happened?
                  <input value={customScenario} onChange={(event) => setCustomScenario(event.target.value)} maxLength={120} placeholder="A few words is plenty" />
                </label>}
                <label className="field-label">Who are you talking to?
                  <input value={recipient} onChange={(event) => setRecipient(event.target.value)} maxLength={100} placeholder="A friend, your manager…" />
                </label>
                <label className="field-label">Where will you say it?
                  <span className="select-wrap">
                    <select value={channel} onChange={(event) => setChannel(event.target.value as GenerateInput["channel"])}>
                      <option value="text">Text message</option><option value="email">Email</option>
                      <option value="work_chat">Work chat</option><option value="in_person">In person</option>
                    </select><ChevronDown size={16} />
                  </span>
                </label>
              </div>
              <label className="field-label context-label">Anything else we should know? <span className="optional">OPTIONAL</span>
                <textarea value={context} onChange={(event) => setContext(event.target.value)} maxLength={500} rows={3} placeholder="The details that make this one a little more… you." />
                <span className="character-count">{context.length}/500</span>
              </label>

              <div className="divider" />
              <div className="tone-title-row"><div><span className="section-kicker">02 / PICK YOUR TONE</span><h2>How should it sound?</h2></div></div>
              <div className="tone-grid" role="group" aria-label="Message tone">
                {tones.map((tone) => (
                  <button key={tone.id} className={`tone-option ${preferences.mode === tone.id ? "selected" : ""}`} aria-pressed={preferences.mode === tone.id}
                    onClick={() => void savePreferences({ ...preferences, mode: tone.id })}>
                    <span className="tone-glyph">{tone.symbol}</span><span className="tone-name">{tone.title}</span><span className="tone-hint">{tone.hint}</span>
                    {preferences.mode === tone.id && <span className="tone-check"><Check size={12} /></span>}
                  </button>
                ))}
              </div>
              <div className="range-row">
                <label htmlFor="directness"><span>Soft around the edges</span><strong>How direct?</strong><span>Say it plainly</span></label>
                <input id="directness" type="range" min="0" max="100" step="5" value={preferences.directness} aria-label="How direct should the message be?"
                  onChange={(event) => {
                    const next = { ...preferences, directness: Number(event.target.value) };
                    setPreferences(next);
                  }}
                />
              </div>
              <div className="length-row">
                <span className="section-kicker">MESSAGE LENGTH</span>
                <div role="group" aria-label="Message length">
                  {(["short", "medium", "long"] as Length[]).map((item) => <button key={item} className={`length-chip ${preferences.length === item ? "active" : ""}`}
                    aria-pressed={preferences.length === item} onClick={() => void savePreferences({ ...preferences, length: item })}>{item}</button>)}
                </div>
              </div>
              <button className="generate-button" onClick={() => void generate()} disabled={generating}>
                {generating ? <LoaderCircle size={18} className="spin" /> : <WandSparkles size={18} />}
                {generating ? "Finding the words…" : "Find my words"}<ArrowRight size={17} className="button-arrow" />
              </button>
              <p className="privacy-note"><Heart size={13} />{aiEnabled
                ? " Generation inputs go to the configured AI provider; avoid sensitive details."
                : " No external AI provider is used. Messages save to your anonymous profile."}</p>
            </section>

            <aside className="right-column">
              <MessageCard active={active} draft={draft} setDraft={setDraft} onCopy={() => void copyText(draft)} onSave={() => void saveDraft()}
                onEditSave={() => void persistEdit()} onRegenerate={() => void generate()} generating={generating} />
              <section className="meter-card">
                <div className="meter-top"><span className="section-kicker">THE AWKWARDNESS METER</span><span className="meter-mark">◎</span></div>
                <div className="meter-content">
                  <div className="meter-number">{active?.score ?? "—"}<span>/100</span></div>
                  <div className="meter-meter" role="img" aria-label={active ? `Heuristic awkwardness signal ${active.score} out of 100; lower is fewer wording signals` : "Generate a message to see its heuristic score"}>
                    <span style={{ width: `${active?.score ?? 0}%` }} />
                  </div>
                  <p>{active ? active.explanation : "Your message gets a little clarity check here."}</p>
                </div>
                <div className="meter-foot"><Lightbulb size={14} /> A writing heuristic, not a prediction of anyone's reaction.</div>
              </section>
              <section className="aside-tip">
                <span className="tip-icon"><Sparkles size={17} /></span>
                <div><span className="section-kicker">A GENTLE REMINDER</span><p>You don't need the perfect excuse. Clear and kind is usually enough.</p></div>
              </section>
            </aside>
          </div>

          <section className="bottom-invite">
            <div><span className="section-kicker">WORDS AREN'T THE ONLY WAY THROUGH</span><h2>Want to try the conversation first?</h2></div>
            <button className="outline-button" onClick={() => setPage("practice")}>Step into the practice room <ArrowDownRight size={16} /></button>
          </section>
        </main>
      )}

      {page === "guides" && <GuidesPage guides={guides} search={guideSearch} onSearch={setGuideSearch} onBookmark={toggleBookmark} onUse={openGuide} onPractice={(id) => { changeSimulator(id); setPage("practice"); }} />}
      {page === "practice" && <PracticePage simulator={simulator} node={currentNode} path={simPath} onSelect={changeSimulator} onMove={moveSimulator} onRestart={() => changeSimulator(simulatorId)} />}
      {page === "saved" && <SavedPage messages={savedMessages} history={messages} guides={bookmarkedGuides} onCopy={copyText} onOpen={(message) => { setActive(message); setDraft(message.text); setPage("write"); }} onUnsave={(message) => void saveSpecificMessage(message, setMessages, setSavedMessages, setActive, setNotice)} />}

      <footer className="footer"><span>awkwardly <span className="footer-dot">✳</span> made for the human bits</span><span>Be kind to yourself out there.</span></footer>
    </div>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button className={`nav-item ${active ? "current" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>{children}</button>;
}

function MessageCard({ active, draft, setDraft, onCopy, onSave, onEditSave, onRegenerate, generating }: {
  active: Message | null; draft: string; setDraft: (value: string) => void; onCopy: () => void;
  onSave: () => void; onEditSave: () => void; onRegenerate: () => void; generating: boolean;
}) {
  return (
    <section className="card result-card" aria-labelledby="result-title">
      <div className="result-top"><div><span className="section-kicker">YOUR WORDS, FOUND</span><h2 id="result-title">{active ? "A place to start." : "Your words will go here."}</h2></div>
        <span className="heading-icon peach"><Mic2 size={20} /></span></div>
      {active ? <>
        <div className="message-meta"><span>{toneName[active.mode]}</span><span className="meta-dot">·</span><span>{new Date(active.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <span className={`provider-pill ${active.provider === "ai" ? "provider-ai" : ""}`}>{active.provider === "ai" ? "AI assisted" : "Thoughtful templates"}</span></div>
        <label className="sr-only" htmlFor="message-draft">Edit your generated message</label>
        <textarea id="message-draft" className="message-text" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1400} aria-describedby="edit-hint" />
        <div className="edit-hint" id="edit-hint">This is a starting point. Make it sound like you.</div>
        <div className="message-actions">
          <button className="primary-small" onClick={onCopy}><Copy size={15} /> Copy</button>
          <button className="icon-action" onClick={onSave} aria-label={active.savedAt ? "Remove from saved messages" : "Save message"} title={active.savedAt ? "Unsave" : "Save"}>
            {active.savedAt ? <Check size={16} /> : <Bookmark size={16} />}
          </button>
          {draft !== active.text && <button className="icon-action" onClick={onEditSave} aria-label="Save edits" title="Save edits"><Check size={16} /></button>}
          <button className="icon-action regenerate" onClick={onRegenerate} disabled={generating} aria-label="Regenerate message" title="Try another version">
            {generating ? <LoaderCircle size={16} className="spin" /> : <RotateCcw size={16} />}
          </button>
        </div>
      </> : <div className="empty-message"><div className="empty-sparkle">✳</div><p>Tell us what's going on. We'll help you find a kind, honest place to start.</p><span>YOUR DRAFT WILL APPEAR HERE</span></div>}
    </section>
  );
}

function GuidesPage({ guides, search, onSearch, onBookmark, onUse, onPractice }: {
  guides: (Guide & { bookmarked: boolean })[]; search: string; onSearch: (value: string) => void;
  onBookmark: (guide: Guide & { bookmarked: boolean }) => void; onUse: (guide: Guide) => void; onPractice: (id: string) => void;
}) {
  return (
    <main className="inner-page">
      <div className="page-intro"><span className="section-kicker">A FIELD GUIDE FOR THE HUMAN BITS</span><div className="page-title-row">
        <h1>The awkwardness<br /><em>survival guide.</em></h1><p>Practical words for the moments that make you rehearse the conversation in the shower.</p>
      </div></div>
      <div className="guide-toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Find a moment…" aria-label="Search survival guides" /></label>
        <span>{guides.length} small lifelines</span></div>
      {guides.length ? <div className="guide-grid">{guides.map((guide, index) => <article className={`guide-card guide-card-${index % 3}`} key={guide.id}>
        <div className="guide-card-top"><span className="guide-category">{guide.category}</span><button className={`bookmark-button ${guide.bookmarked ? "bookmarked" : ""}`} aria-label={guide.bookmarked ? `Remove bookmark for ${guide.title}` : `Bookmark ${guide.title}`} onClick={() => onBookmark(guide)}><Bookmark size={16} fill={guide.bookmarked ? "currentColor" : "none"} /></button></div>
        <h2>{guide.title}</h2><p className="guide-description">{guide.description}</p>
        <div className="guide-example"><span className="example-label"><Check size={12} /> WHAT TO SAY</span><p>“{guide.say}”</p></div>
        <div className="guide-avoid"><span>WHAT NOT TO SAY</span><p>“{guide.avoid}”</p></div>
        <details className="variants-details"><summary>Show four ways to say it <ChevronDown size={14} /></summary><div className="variant-list">
          {guide.variants.map((variant) => <p key={variant.tone}><span>{variant.tone}</span>{variant.text}</p>)}
        </div></details>
        <div className="guide-advice"><Lightbulb size={15} /><p>{guide.advice}</p></div>
        <div className="guide-actions"><button className="primary-small" onClick={() => onUse(guide)}><WandSparkles size={14} /> Make it yours</button><button className="practice-link" onClick={() => onPractice(guide.id)}>Practice it <ArrowRight size={14} /></button></div>
      </article>)}</div> : <div className="empty-state"><Search size={25} /><h2>No guides found yet.</h2><p>Try a different word, or explore “boundaries” and “plans.”</p></div>}
    </main>
  );
}

function PracticePage({ simulator, node, path, onSelect, onMove, onRestart }: {
  simulator: typeof scenarios[number]; node: typeof scenarios[number]["nodes"][string]; path: string[];
  onSelect: (id: string) => void; onMove: (next: string) => void; onRestart: () => void;
}) {
  const progress = node.outcome ? 100 : Math.min(88, Math.max(12, (path.length - 1) * 26));
  return (
    <main className="inner-page practice-page">
      <div className="page-intro"><span className="section-kicker">NO REAL-LIFE STAKES, JUST PRACTICE</span><div className="page-title-row">
        <h1>Let's try it<br /><em>out loud.</em></h1><p>Pick a scenario, try a few different words, and see how the conversation could go. Real people are less predictable, of course.</p>
      </div></div>
      <div className="practice-layout">
        <aside className="scenario-list"><span className="section-kicker">CHOOSE A SCENARIO</span>{scenarios.map((item, index) =>
          <button className={`scenario-choice ${simulator.id === item.id ? "selected" : ""}`} key={item.id} onClick={() => onSelect(item.id)} aria-pressed={simulator.id === item.id}>
            <span className="scenario-num">0{index + 1}</span><span>{item.title}</span><ArrowRight size={14} />
          </button>)}
          <div className="scenario-note"><span>✳</span><p>These are just illustrations. You can choose your words; you can't choose someone else's reaction.</p></div>
        </aside>
        <section className="sim-card" aria-label={`${simulator.title} conversation practice`}>
          <div className="sim-top"><div><span className="section-kicker">{simulator.category.toUpperCase()} / PRACTICE</span><h2>{simulator.title}</h2></div><button className="restart-button" onClick={onRestart}><RotateCcw size={14} /> Start over</button></div>
          <p className="sim-description">{simulator.description}</p>
          <div className="progress-line"><div><span>CONVERSATION PATH</span><span>{node.outcome ? "COMPLETE" : `STEP ${path.length} OF 4`}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
          <div className="conversation-box">
            <div className="chat-avatar">{node.choices ? <span>✳</span> : <span>↳</span>}</div>
            <div className="chat-bubble"><span className="chat-speaker">{node.choices ? "THE OTHER PERSON" : "A MOMENT LATER"}</span><p>{node.text}</p></div>
          </div>
          {node.outcome && <div className={`outcome-box outcome-${node.outcome}`}><span>{node.outcome === "smooth" ? "A GOOD LANDING" : "A REALISTIC MOMENT"}</span><p>{node.insight}</p></div>}
          {node.choices ? <div className="choice-area"><span className="section-kicker">WHAT MIGHT YOU SAY?</span><div className="choice-list">{node.choices.map((choice, index) =>
            <button className="sim-choice" key={`${choice.next}-${index}`} onClick={() => onMove(choice.next)}><span>{String.fromCharCode(65 + index)}</span><span>{choice.label}</span><ArrowRight size={16} /></button>)}</div></div>
            : <button className="try-again-button" onClick={onRestart}><RotateCcw size={15} /> Try another approach</button>}
          <div className="sim-disclaimer"><Lightbulb size={14} /> Just one possible path. A conversation isn't a script.</div>
        </section>
      </div>
    </main>
  );
}

function SavedPage({ messages, history, guides, onCopy, onOpen, onUnsave }: {
  messages: Message[]; history: Message[]; guides: (Guide & { bookmarked: boolean })[]; onCopy: (text: string) => void;
  onOpen: (message: Message) => void; onUnsave: (message: Message) => void;
}) {
  return (
    <main className="inner-page saved-page">
      <div className="page-intro"><span className="section-kicker">YOUR LITTLE COLLECTION</span><div className="page-title-row">
        <h1>Keep the words<br /><em>that work.</em></h1><p>Messages and guides you saved for another day. Only you can see these.</p>
      </div></div>
      <section className="saved-section"><div className="saved-section-heading"><h2>Saved messages</h2><span>{messages.length}</span></div>
        {messages.length ? <div className="saved-messages">{messages.map((message) => <article key={message.id} className="saved-message">
          <div className="saved-message-top"><span>{message.scenario}</span><span>{new Date(message.createdAt).toLocaleDateString()}</span></div><p>{message.text}</p>
          <div className="saved-message-actions"><button onClick={() => onOpen(message)}><ArrowLeft size={14} /> Open in studio</button><button onClick={() => onCopy(message.text)}><Copy size={14} /> Copy</button><button onClick={() => onUnsave(message)}><X size={14} /> Remove</button></div>
        </article>)}</div> : <div className="saved-empty"><Bookmark size={20} /><p>No saved messages just yet. Make one in the studio and tap the bookmark to keep it.</p></div>}
      </section>
      <section className="saved-section"><div className="saved-section-heading"><h2>Bookmarked guides</h2><span>{guides.length}</span></div>
        {guides.length ? <div className="saved-guide-links">{guides.map((guide) => <div key={guide.id}><div><span className="section-kicker">{guide.category}</span><h3>{guide.title}</h3><p>{guide.description}</p></div><span>Saved <Bookmark size={14} fill="currentColor" /></span></div>)}</div>
          : <div className="saved-empty"><Bookmark size={20} /><p>No guides saved yet. Tap the bookmark on a guide you'd like to revisit.</p></div>}
      </section>
      <section className="saved-section"><div className="saved-section-heading"><h2>Recent generation history</h2><span>{history.length}</span></div>
        {history.length ? <div className="saved-messages">{history.map((message) => <article key={message.id} className="saved-message">
          <div className="saved-message-top"><span>{message.scenario}</span><span>{new Date(message.createdAt).toLocaleDateString()}</span></div><p>{message.text}</p>
          <div className="saved-message-actions"><button onClick={() => onOpen(message)}><ArrowLeft size={14} /> Open in studio</button><button onClick={() => onCopy(message.text)}><Copy size={14} /> Copy</button>
            <span className="history-status">{message.savedAt ? "Saved" : "History"}</span></div>
        </article>)}</div> : <div className="saved-empty"><MessageCircle size={20} /><p>Your recent generated messages will show up here.</p></div>}
      </section>
    </main>
  );
}

async function saveSpecificMessage(
  message: Message,
  setMessages: (update: (old: Message[]) => Message[]) => void,
  setSavedMessages: (update: (old: Message[]) => Message[]) => void,
  setActive: (message: Message | null) => void,
  setNotice: (notice: string) => void,
) {
  try {
    await api.saveMessage(message.id, false);
    setMessages((old) => old.map((item) => item.id === message.id ? { ...item, savedAt: null } : item));
    setSavedMessages((old) => old.filter((item) => item.id !== message.id));
    setActive(null);
    setNotice("Removed from saved messages.");
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Couldn't update this message.");
  }
}

export default App;
