"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "AI" | "Science" | "Business" | "Design" | "Other";

type Submission = {
  id: string;
  username: string;
  word: string;
  category: Category;
  createdAt: string;
};

type WordStat = {
  word: string;
  count: number;
  categories: Category[];
  contributors: string[];
};

const categoryColors: Record<Category, string> = {
  AI: "#7c3aed",
  Science: "#0891b2",
  Business: "#ea580c",
  Design: "#db2777",
  Other: "#64748b"
};

const initialUsers = ["Aarav", "Maya", "Noah", "Sophia", "Liam", "Emma", "Keshav", "Guest"];
const initialCategories: Category[] = ["AI", "Science", "Business", "Design", "Other"];

export default function Home() {
  const [allowedUsers, setAllowedUsers] = useState(initialUsers);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [username, setUsername] = useState(initialUsers[0]);
  const [word, setWord] = useState("");
  const [category, setCategory] = useState<Category>("AI");
  const [filter, setFilter] = useState<Category | "All">("All");
  const [status, setStatus] = useState("Loading ideas...");
  
  // Background image states
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.3);
  const [backgroundSize, setBackgroundSize] = useState("cover");
  const [useBackground, setUseBackground] = useState(false);

  async function loadSubmissions() {
    const response = await fetch("/api/submissions", { cache: "no-store" });
    if (!response.ok) {
      setStatus("Could not load the cloud. Try refreshing.");
      return;
    }

    const data = await response.json();
    setAllowedUsers(data.allowedUsers);
    setCategories(data.categories);
    setSubmissions(data.submissions);
    setStatus(data.storageConfigured ? "Ready for new ideas." : "Connect Vercel Blob to save new submissions.");
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(loadSubmissions, 0);
    const timer = window.setInterval(loadSubmissions, 5000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    const map = new Map<string, WordStat>();
    const visible = filter === "All" ? submissions : submissions.filter((item) => item.category === filter);

    visible.forEach((item) => {
      const key = item.word.toLowerCase();
      const existing = map.get(key) ?? {
        word: item.word,
        count: 0,
        categories: [],
        contributors: []
      };

      existing.count += 1;
      if (!existing.categories.includes(item.category)) existing.categories.push(item.category);
      if (!existing.contributors.includes(item.username)) existing.contributors.push(item.username);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  }, [filter, submissions]);

  const totalVotes = stats.reduce((sum, item) => sum + item.count, 0);
  const topWord = stats[0];
  const maxCount = Math.max(1, ...stats.map((item) => item.count));

  async function submitWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Adding your word...");

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, word, category })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Could not add that word.");
      return;
    }

    setSubmissions((current) => [data.submission, ...current]);
    setWord("");
    setStatus("Added. The cloud is refreshed for everyone on this deployment.");
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function clearBackground() {
    setBackgroundImage("");
    setUseBackground(false);
  }

  const cloudPanelStyle: React.CSSProperties = useBackground && backgroundImage ? {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: backgroundSize as any,
    backgroundPosition: "center",
    backgroundAttachment: "fixed"
  } : {};

  const cloudOverlayStyle: React.CSSProperties = useBackground && backgroundImage ? {
    background: `rgba(255, 255, 255, ${1 - backgroundOpacity})`,
    backdropFilter: "blur(4px)"
  } : {};

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Shared learning board</p>
          <h1>What should we learn next?</h1>
          <p className="subtitle">
            Pick your name, add a topic, and watch the most popular learning ideas bloom into a cloud.
          </p>
        </div>
        <div className="hero-card">
          <span>Top topic</span>
          <strong>{topWord?.word ?? "Waiting..."}</strong>
          <small>{topWord ? `${topWord.count} vote${topWord.count === 1 ? "" : "s"}` : "Add the first word"}</small>
        </div>
      </section>

      <section className="grid">
        <form className="panel form-panel" onSubmit={submitWord}>
          <div>
            <h2>Add a word</h2>
            <p>Choose a pre-approved name and group your topic.</p>
          </div>

          <label>
            Username
            <select value={username} onChange={(event) => setUsername(event.target.value)}>
              {allowedUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </label>

          <label>
            Word or topic
            <input
              maxLength={40}
              placeholder="e.g. Neural networks"
              value={word}
              onChange={(event) => setWord(event.target.value)}
              required
            />
          </label>

          <label>
            Group
            <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
              {categories.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Add to cloud</button>
          <p className="status">{status}</p>

          {/* Background Image Section */}
          <div className="background-section">
            <h3>Background Image</h3>
            
            <label>
              <input
                type="checkbox"
                checked={useBackground}
                onChange={(e) => setUseBackground(e.target.checked)}
              />
              Enable background image
            </label>

            {useBackground && (
              <>
                <label>
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>

                {backgroundImage && (
                  <>
                    <label>
                      Background Opacity
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={backgroundOpacity}
                        onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                      />
                      <span className="opacity-value">{Math.round(backgroundOpacity * 100)}%</span>
                    </label>

                    <label>
                      Background Size
                      <select value={backgroundSize} onChange={(e) => setBackgroundSize(e.target.value)}>
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="100% 100%">Stretch</option>
                      </select>
                    </label>

                    <button type="button" onClick={clearBackground} className="clear-bg-btn">
                      Clear Background
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </form>

        <section className="panel cloud-panel" style={cloudPanelStyle}>
          <div className="cloud-overlay" style={cloudOverlayStyle}>
            <div className="cloud-header">
              <div>
                <h2>Word cloud</h2>
                <p>{totalVotes} visible submission{totalVotes === 1 ? "" : "s"}</p>
              </div>
              <select value={filter} onChange={(event) => setFilter(event.target.value as Category | "All")}>
                <option value="All">All groups</option>
                {categories.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div className="cloud">
              {stats.map((item, index) => {
                const mainCategory = item.categories[0];
                const size = 1 + item.count / maxCount * 2.4;
                return (
                  <button
                    className="cloud-word"
                    key={item.word}
                    style={{
                      "--word-color": categoryColors[mainCategory],
                      "--word-size": `${size}rem`,
                      "--delay": `${index * 40}ms`
                    } as React.CSSProperties}
                    title={`${item.word}: ${item.count} vote(s) by ${item.contributors.join(", ")}`}
                  >
                    {item.word}
                    <span>{item.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </section>

      <section className="insights">
        <article className="panel">
          <h2>Groups</h2>
          <div className="group-list">
            {categories.map((group) => {
              const count = submissions.filter((item) => item.category === group).length;
              const percent = submissions.length ? Math.round(count / submissions.length * 100) : 0;
              return (
                <div className="group-row" key={group}>
                  <span style={{ background: categoryColors[group] }} />
                  <strong>{group}</strong>
                  <div>
                    <i style={{ width: `${percent}%`, background: categoryColors[group] }} />
                  </div>
                  <em>{count}</em>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <h2>Popularity</h2>
          <ol className="ranking">
            {stats.slice(0, 6).map((item) => (
              <li key={item.word}>
                <span>{item.word}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <h2>Recent</h2>
          <div className="recent-list">
            {submissions.slice(0, 7).map((item) => (
              <p key={item.id}>
                <strong>{item.username}</strong> added <span>{item.word}</span>
              </p>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
