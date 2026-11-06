"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Check,
  ChevronRight,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Network,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = Record<string, any>;
const items = [
  ["dashboard", "Overview", LayoutDashboard],
  ["hospitals", "Hospital network", Building2],
  ["imaging", "Medical imaging", ImageIcon],
  ["clinical-text", "Clinical text", FileText],
  ["multimodal", "Multimodal fusion", BrainCircuit],
  ["federated", "Federated learning", Network],
  ["privacy", "Privacy & security", ShieldCheck],
  ["evaluation", "Model evaluation", FlaskConical],
  ["datasets", "Dataset management", Database],
  ["training-history", "Training history", History],
  ["analytics", "Analytics & reports", BarChart3],
  ["audit-logs", "Audit logs", LockKeyhole],
  ["settings", "Settings", Settings],
] as const;
const seedHospitals = [
  "City General Hospital",
  "Apollo Research Hospital",
  "Sunrise Medical Center",
  "Global Health Institute",
  "Advanced Care Hospital",
].map((name, i) => ({
  id: i + 1,
  name,
  location: ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Delhi"][i],
  active: true,
  samples: 80 + i * 16,
  clinical: 80 + i * 16,
  status: "Configured",
}));
const pct = (n: number | undefined | null) =>
  n == null ? "—" : `${(n * 100).toFixed(1)}%`;
function download(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function Chart({ data }: { data: Row[] }) {
  return data.length ? (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3976ee" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3976ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="#e9eef5"
        />
        <XAxis dataKey="round" axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(v) => pct(Number(v))} />
        <Area
          type="monotone"
          dataKey="accuracy"
          stroke="#3976ee"
          fill="url(#blue)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  ) : (
    <div className="chart-empty">
      <GitBranch size={32} />
      <strong>Your next discovery starts here</strong>
      <span>Run an experiment to see measured training performance.</span>
      <Link href="/federated">
        Configure training <ArrowRight size={15} />
      </Link>
    </div>
  );
}
function Table({ rows, columns }: { rows: Row[]; columns: string[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const p = Math.min(page, pages - 1);
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c.replaceAll("_", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(p * 8, p * 8 + 8).map((r, i) => (
              <tr key={r.id ?? i}>
                {columns.map((c) => (
                  <td key={c}>
                    {typeof r[c] === "number"
                      ? Number.isInteger(r[c])
                        ? r[c]
                        : r[c].toFixed(4)
                      : typeof r[c] === "object"
                        ? JSON.stringify(r[c])
                        : String(r[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            No records yet. Completed actions will appear here.
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="pagination">
          <button disabled={!p} onClick={() => setPage(p - 1)}>
            Previous
          </button>
          <span>
            {p + 1} / {pages}
          </span>
          <button disabled={p + 1 === pages} onClick={() => setPage(p + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
export default function Workspace() {
  const path = usePathname();
  const module = path.split("/")[1] || "dashboard";
  const title = items.find((i) => i[0] === module)?.[1] || "Account access";
  const [base, setBase] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<Row | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [overview, setOverview] = useState<Row>({
    network: seedHospitals,
    performance: [],
    activity: [],
    hospitals: 5,
    active: 0,
    imaging_samples: 560,
    clinical_records: 560,
    rounds: 0,
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [result, setResult] = useState<Row | null>(null);
  const [text, setText] = useState(
    "Patient name: Synthetic Example\nMRN: SYN-001\nClinical observation: cough and fever. Imaging describes opacity. This is synthetic research text.",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [job, setJob] = useState<Row | null>(null);
  const [hospital, setHospital] = useState<Row | null>(null);
  const [config, setConfig] = useState<Row>({
    name: "Multimodal federation",
    rounds: 8,
    epochs: 2,
    batch_size: 16,
    learning_rate: 0.1,
    strategy: "FedAvg",
    modality: "multimodal",
    noise: 0,
    clip_norm: 1,
  });
  const [email, setEmail] = useState("admin@medifed.ai");
  const [password, setPassword] = useState("");
  useEffect(() => {
    setBase(
      localStorage.getItem("medifed.api") ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:8000",
    );
    setToken(sessionStorage.getItem("medifed.token") || "");
    setDark(localStorage.getItem("medifed.theme") === "dark");
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  const api = useCallback(
    async (endpoint: string, method = "GET", body?: unknown, raw = false) => {
      if (!base) throw Error("Configure your Python API URL in Settings.");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (body && !(body instanceof FormData))
        headers["Content-Type"] = "application/json";
      const res = await fetch(`${base.replace(/\/$/, "")}/api${endpoint}`, {
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) {
        let error;
        try {
          error = await res.json();
        } catch {
          error = { detail: res.statusText };
        }
        throw Error(
          typeof error.detail === "string"
            ? error.detail
            : JSON.stringify(error.detail),
        );
      }
      return raw ? res.blob() : res.json();
    },
    [base, token],
  );
  const refresh = useCallback(async () => {
    try {
      await api("/health");
      setOnline(true);
      if (token) {
        const [u, o] = await Promise.all([
          api("/auth/me"),
          api("/dashboard/overview"),
        ]);
        setUser(u);
        setOverview(o);
      }
    } catch {
      setOnline(false);
    }
  }, [api, token]);
  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);
  useEffect(() => {
    setResult(null);
    setRows([]);
    setHospital(null);
    setMobile(false);
    if (!token || !online) return;
    const endpoints: Record<string, string> = {
      hospitals: "/hospitals",
      datasets: "/datasets",
      "training-history": "/federated/experiments",
      federated: "/federated/experiments",
      evaluation: "/evaluation/results",
      "audit-logs": "/audit-logs",
      analytics: "/reports",
    };
    if (endpoints[module])
      api(endpoints[module])
        .then(setRows)
        .catch((e) => setNotice(e.message));
    if (module === "privacy")
      api("/privacy/status")
        .then(setResult)
        .catch((e) => setNotice(e.message));
  }, [module, token, online, api]);
  useEffect(() => {
    if (!job || !["running", "paused"].includes(job.status)) return;
    const timer = setInterval(() => {
      api(`/federated/experiments/${job.id}/status`)
        .then((r) => {
          setJob({ ...r, id: job.id });
          if (!["running", "paused"].includes(r.status)) void refresh();
        })
        .catch((e) => setNotice(e.message));
    }, 1000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, api, refresh]);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  function requireSession() {
    if (!token)
      throw Error("Sign in to your Python backend to use this workspace.");
    if (!online)
      throw Error(
        "Python backend unavailable. Start it locally or configure its HTTPS URL in Settings.",
      );
  }
  async function exportReport(format: string) {
    requireSession();
    const blob = await api("/reports/generate", "POST", { format }, true);
    download(blob, `medifed-report.${format}`);
    setNotice("Report downloaded from stored experiment records.");
  }
  const filtered = rows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
  );
  const hs = (online ? overview.network : seedHospitals) || [];
  const latest = (overview.performance || []).at(-1);
  if (!ready) return <div className="loading">Opening MediFed AI…</div>;
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <Link href="/" className="brand">
          <div className="brand-icon">
            <Activity size={25} />
          </div>
          <div>
            MediFed<span> AI</span>
            <small>CONNECTED RESEARCH. PRIVATE DATA.</small>
          </div>
        </Link>
        <div className="workspace-label">
          RESEARCH WORKSPACE <span>v1.0</span>
        </div>
        <nav>
          {items.map(([id, label, Icon], i) => (
            <div key={id}>
              {i === 6 && (
                <div className="nav-divider">GOVERNANCE & INSIGHTS</div>
              )}
              <Link
                className={module === id ? "nav-item selected" : "nav-item"}
                href={`/${id}`}
              >
                <Icon size={18} />
                {label}
                {id === "federated" && <span className="nav-dot" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-icon">
            <ShieldCheck size={19} />
          </div>
          <div>
            <strong>Privacy by design</strong>
            <p>
              Research stays connected.
              <br />
              Raw data stays local.
            </p>
          </div>
        </div>
        <Link href="/settings" className="profile">
          <div className="avatar">{user ? "RA" : "DE"}</div>
          <div>
            <strong>{user ? "Research account" : "Demo explorer"}</strong>
            <small>{user?.role || "Workspace preview"}</small>
          </div>
          <Settings size={16} />
        </Link>
      </aside>
      <div className="main">
        <header>
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="header-tools">
            <div className="search">
              <Search size={16} />
              <input
                placeholder="Search workspace…"
                aria-label="Search workspace"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <div className="search-results">
                  {items
                    .filter((i) =>
                      i[1].toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((i) => (
                      <Link
                        href={`/${i[0]}`}
                        key={i[0]}
                        onClick={() => setQuery("")}
                      >
                        {i[1]}
                      </Link>
                    ))}
                </div>
              )}
            </div>
            <span className={`status ${online ? "connected" : ""}`}>
              <i />
              {online ? "API connected" : "API offline"}
            </span>
            <button
              className="icon-button"
              title="Toggle theme"
              onClick={() => {
                setDark(!dark);
                localStorage.setItem("medifed.theme", dark ? "light" : "dark");
              }}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button"
              title="Notifications"
              onClick={() =>
                setNotice(
                  online
                    ? "Notifications: your research workspace is connected."
                    : "Start the Python backend and sign in to run analyses and training.",
                )
              }
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <Link href="/login" className="avatar small">
              {user ? "RA" : "DE"}
            </Link>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <FlaskConical size={16} />
            <strong>Synthetic research environment</strong>
            <span>
              Demonstration data only. Outputs are not clinical diagnoses.
            </span>
            <Link href="/privacy">
              View safeguards <ArrowRight size={13} />
            </Link>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MEDIFED INTELLIGENCE PLATFORM</div>
              <h1>{module === "dashboard" ? "Research overview" : title}</h1>
              <p>
                {module === "dashboard"
                  ? "A connected view of your hospital network, models, and research progress."
                  : module === "federated"
                    ? "Collaborative learning. Local data. Measurable progress."
                    : "Your workspace for privacy-aware multimodal healthcare research."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await refresh();
                    setNotice("Connection status refreshed.");
                  })
                }
              >
                <RefreshCw size={15} />
                Refresh
              </button>
              {module === "dashboard" && (
                <Link className="primary" href="/federated">
                  <Plus size={17} />
                  New experiment
                </Link>
              )}
            </div>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!online && (
            <div className="connection-note">
              <span>
                <strong>Workspace preview</strong> · Connect the Python backend
                to run analyses, save records, and train models.
              </span>
              <Link href="/settings">
                Configure connection <ArrowRight size={14} />
              </Link>
            </div>
          )}
          {module === "dashboard" && (
            <>
              <div className="metrics">
                {[
                  [
                    "Registered hospitals",
                    overview.hospitals,
                    Building2,
                    "5 synthetic clients configured",
                  ],
                  [
                    "Imaging samples",
                    overview.imaging_samples,
                    ImageIcon,
                    "Synthetic feature samples",
                  ],
                  [
                    "Clinical records",
                    overview.clinical_records,
                    FileText,
                    "Synthetic feature samples",
                  ],
                  [
                    "Global accuracy",
                    pct(overview.accuracy),
                    Activity,
                    overview.accuracy == null
                      ? "Awaiting first evaluation"
                      : "Measured on held-out synthetic data",
                  ],
                ].map(([label, value, Icon, note]) => {
                  const I = Icon as typeof Activity;
                  return (
                    <article className="metric" key={String(label)}>
                      <div>
                        <span>{String(label)}</span>
                        <div className="metric-icon">
                          <I size={18} />
                        </div>
                      </div>
                      <strong>{String(value ?? "—")}</strong>
                      <small>
                        {label === "Registered hospitals" && (
                          <i className="green-dot" />
                        )}
                        {String(note)}
                      </small>
                    </article>
                  );
                })}
              </div>
              <div className="overview-grid">
                <section className="card performance">
                  <div className="card-heading">
                    <div>
                      <h2>Federated model performance</h2>
                      <p>Global accuracy across completed training rounds</p>
                    </div>
                    <span className="tag">{overview.rounds} rounds</span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i />
                      Global accuracy
                    </span>
                    <span className="muted">
                      Held-out evaluation · synthetic data
                    </span>
                  </div>
                  <Chart data={overview.performance || []} />
                  <div className="chart-footer">
                    <span>
                      Aggregation <strong>Sample-weighted FedAvg</strong>
                    </span>
                    <span>
                      Data shared <strong>Model parameters only</strong>
                    </span>
                    <span>
                      Latest loss{" "}
                      <strong>{latest?.loss?.toFixed(4) || "—"}</strong>
                    </span>
                  </div>
                </section>
                <section className="card network-card">
                  <div className="card-heading">
                    <div>
                      <h2>Hospital network</h2>
                      <p>Independent simulated clients</p>
                    </div>
                    <Link href="/hospitals" className="text-link">
                      View all <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="network-diagram">
                    <div className="orbit o1" />
                    <div className="orbit o2" />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div className={`hospital-node n${i}`} key={i}>
                        <Building2 size={18} />
                      </div>
                    ))}
                    <div className="central-node">
                      <Network size={28} />
                      <span>GLOBAL MODEL</span>
                    </div>
                  </div>
                  <div className="network-summary">
                    <div>
                      <i className="green-dot" />
                      <strong>{online ? overview.active : 0}</strong>
                      <span>connected</span>
                    </div>
                    <div>
                      <i className="gray-dot" />
                      <strong>
                        {online ? overview.hospitals - overview.active : 5}
                      </strong>
                      <span>{online ? "inactive" : "configured"}</span>
                    </div>
                  </div>
                  <div className="privacy-strip">
                    <ShieldCheck size={15} /> Raw records stay on simulated
                    clients
                  </div>
                </section>
              </div>
              <div className="bottom-grid">
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Hospital participation</h2>
                      <p>Local synthetic dataset distribution</p>
                    </div>
                    <span className="tag">5 clients</span>
                  </div>
                  <div className="hospital-bars">
                    {hs.map((h: Row, i: number) => (
                      <div key={h.id}>
                        <span className="hospital-initial">{i + 1}</span>
                        <div>
                          <strong>{h.name}</strong>
                          <div className="bar-track">
                            <div style={{ width: `${h.samples / 1.6}%` }} />
                          </div>
                        </div>
                        <span>
                          {h.samples}
                          <small>samples</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Research safeguards</h2>
                      <p>Transparent by default</p>
                    </div>
                    <ShieldCheck size={20} color="#16a58b" />
                  </div>
                  <div className="safeguards">
                    {[
                      [
                        "Local client training",
                        "In-process PyTorch simulation",
                      ],
                      [
                        "Parameter-only aggregation",
                        "No raw records in model updates",
                      ],
                      [
                        "Honest privacy reporting",
                        "No formal DP guarantee claimed",
                      ],
                    ].map(([a, b]) => (
                      <div key={a}>
                        <span className="check-circle">
                          <Check size={14} />
                        </span>
                        <div>
                          <strong>{a}</strong>
                          <p>{b}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/privacy" className="full-link">
                    Explore privacy controls <ArrowRight size={15} />
                  </Link>
                </section>
              </div>
              <section className="card activity">
                <div className="card-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>A traceable record of your research workspace</p>
                  </div>
                  <Link href="/audit-logs" className="text-link">
                    All activity <ArrowRight size={14} />
                  </Link>
                </div>
                <Table
                  rows={overview.activity || []}
                  columns={[
                    "action",
                    "user",
                    "resource",
                    "created_at",
                    "status",
                  ]}
                />
              </section>
            </>
          )}
          {(module === "login" || module === "register") && (
            <section className="card narrow">
              <div className="large-icon">
                <ShieldCheck size={28} />
              </div>
              <h2>
                {module === "register"
                  ? "Create research account"
                  : "Welcome to MediFed AI"}
              </h2>
              <p>
                Connect to your Python API before signing in. New accounts
                receive the researcher role.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    const r = await api(
                      `/auth/${module === "register" ? "register" : "login"}`,
                      "POST",
                      { email, password },
                    );
                    if (module === "register") setNotice(r.message);
                    else {
                      setToken(r.token);
                      sessionStorage.setItem("medifed.token", r.token);
                      setUser(r.user);
                      setNotice("Signed in. Open Overview to begin.");
                    }
                  });
                }}
              >
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    minLength={10}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Connecting…"
                    : module === "register"
                      ? "Create account"
                      : "Sign in"}
                  <ArrowRight size={16} />
                </button>
              </form>
              <Link
                className="text-link"
                href={module === "register" ? "/login" : "/register"}
              >
                {module === "register"
                  ? "Already registered? Sign in"
                  : "Create a researcher account"}
              </Link>
            </section>
          )}
          {module === "hospitals" && (
            <>
              <div className="section-toolbar">
                <span>
                  {online ? rows.length : 5} hospital clients · synthetic data
                </span>
                <button
                  className="primary"
                  onClick={() =>
                    setHospital({
                      name: "",
                      location: "",
                      active: true,
                      samples: 80,
                      clinical: 80,
                    })
                  }
                >
                  <Plus size={16} />
                  Add hospital
                </button>
              </div>
              {hospital && (
                <section className="card">
                  <div className="card-heading">
                    <h2>
                      {hospital.id
                        ? "Hospital details & configuration"
                        : "Register hospital"}
                    </h2>
                    <button
                      className="icon-button"
                      onClick={() => setHospital(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        requireSession();
                        await api(
                          `/hospitals${hospital.id ? `/${hospital.id}` : ""}`,
                          hospital.id ? "PUT" : "POST",
                          hospital,
                        );
                        setRows(await api("/hospitals"));
                        setHospital(null);
                        await refresh();
                        setNotice("Hospital configuration saved.");
                      });
                    }}
                  >
                    {["name", "location", "samples", "clinical"].map((k) => (
                      <label key={k}>
                        {k}
                        <input
                          required
                          type={
                            ["samples", "clinical"].includes(k)
                              ? "number"
                              : "text"
                          }
                          value={hospital[k]}
                          onChange={(e) =>
                            setHospital({
                              ...hospital,
                              [k]: ["samples", "clinical"].includes(k)
                                ? Number(e.target.value)
                                : e.target.value,
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={hospital.active}
                        onChange={(e) =>
                          setHospital({ ...hospital, active: e.target.checked })
                        }
                      />
                      Active simulated client
                    </label>
                    <button className="primary" disabled={busy}>
                      Save hospital
                    </button>
                  </form>
                </section>
              )}
              <div className="hospital-grid">
                {(online ? filtered : seedHospitals).map(
                  (h: Row, i: number) => (
                    <section className="card hospital-card" key={h.id}>
                      <div className="hospital-card-top">
                        <div className="large-icon">
                          <Building2 size={25} />
                        </div>
                        <span className="tag">{h.status}</span>
                      </div>
                      <h2>{h.name}</h2>
                      <p>
                        {h.location} · HOSP-{String(h.id).padStart(3, "0")}
                      </p>
                      <div className="two-stats">
                        <div>
                          <strong>{h.samples}</strong>
                          <span>Imaging samples</span>
                        </div>
                        <div>
                          <strong>{h.clinical}</strong>
                          <span>Clinical records</span>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button
                          className="secondary"
                          onClick={() => setHospital(h)}
                        >
                          View & edit <ArrowRight size={14} />
                        </button>
                        <button
                          className="danger-link"
                          onClick={() => {
                            if (
                              confirm(
                                `Remove demonstration hospital ${h.name}?`,
                              )
                            )
                              act(async () => {
                                requireSession();
                                await api(`/hospitals/${h.id}`, "DELETE");
                                setRows(await api("/hospitals"));
                                await refresh();
                              });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </section>
                  ),
                )}
              </div>
            </>
          )}
          {(module === "imaging" || module === "clinical-text") && (
            <div className="analysis-grid">
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>
                      {module === "imaging"
                        ? "Medical image workspace"
                        : "Clinical document workspace"}
                    </h2>
                    <p>Use synthetic or authorized research files only</p>
                  </div>
                </div>
                <label className="upload-area">
                  <Upload size={30} />
                  <strong>{file ? file.name : "Choose a research file"}</strong>
                  <span>
                    {module === "imaging"
                      ? "PNG, JPEG, DICOM, NIfTI (.nii) · up to 10 MB"
                      : "TXT, PDF, DOCX · up to 10 MB"}
                  </span>
                  <input
                    type="file"
                    accept={
                      module === "imaging"
                        ? ".png,.jpg,.jpeg,.dcm,.dicom,.nii"
                        : ".txt,.pdf,.docx"
                    }
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 10 * 1024 * 1024) {
                        setNotice("Maximum file size is 10 MB");
                        return;
                      }
                      setFile(f);
                    }}
                  />
                </label>
                {preview && (
                  <img
                    className="image-preview"
                    alt="Selected research image"
                    src={preview}
                  />
                )}{" "}
                {module === "clinical-text" && (
                  <label>
                    Clinical notes
                    <textarea
                      rows={10}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </label>
                )}
                <button
                  className="primary"
                  disabled={busy || (module === "imaging" && !file)}
                  onClick={() =>
                    act(async () => {
                      requireSession();
                      let r;
                      if (file) {
                        const form = new FormData();
                        form.append("file", file);
                        r = await api(
                          module === "imaging"
                            ? "/images/upload"
                            : "/clinical-text/upload",
                          "POST",
                          form,
                        );
                        if (r.deidentified_text) setText(r.deidentified_text);
                      } else
                        r = await api("/clinical-text/analyze", "POST", {
                          text,
                        });
                      setResult(r);
                      await refresh();
                    })
                  }
                >
                  <FlaskConical size={16} />
                  {busy ? "Processing…" : "Run analysis"}
                </button>
                <p className="helper">
                  {module === "imaging"
                    ? "Fallback encoder: normalized 4 × 4 grayscale intensity features. No disease classifier."
                    : "Fallback encoder: transparent clinical keyword features. Regex masking is incomplete."}
                </p>
              </section>
              <section className="card">
                <h2>Analysis results</h2>
                {result ? (
                  <>
                    <span className="success-tag">
                      <Check size={14} />
                      Processing complete
                    </span>
                    {result.preview && (
                      <img
                        className="image-preview"
                        src={result.preview}
                        alt="Normalized image preview"
                      />
                    )}
                    {result.deidentified_text && (
                      <pre>{result.deidentified_text}</pre>
                    )}
                    {result.entities && (
                      <div className="entity-list">
                        {result.entities.map((e: Row) => (
                          <span className="tag" key={e.term}>
                            {e.term} ×{e.count}
                          </span>
                        ))}
                      </div>
                    )}
                    <dl>
                      {Object.entries(result)
                        .filter(
                          ([k]) =>
                            ![
                              "preview",
                              "embedding",
                              "entities",
                              "deidentified_text",
                            ].includes(k),
                        )
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt>{k.replaceAll("_", " ")}</dt>
                            <dd>{String(v)}</dd>
                          </div>
                        ))}
                    </dl>
                    <button
                      className="secondary"
                      onClick={() =>
                        download(
                          new Blob([JSON.stringify(result, null, 2)], {
                            type: "application/json",
                          }),
                          "analysis.json",
                        )
                      }
                    >
                      <ArrowDownToLine size={15} />
                      Export result
                    </button>
                  </>
                ) : (
                  <div className="empty tall">
                    <FlaskConical size={30} />
                    <strong>Ready when you are</strong>
                    <p>
                      Upload a file or enter text to inspect real preprocessing
                      results.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
          {module === "multimodal" && (
            <>
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>Two modalities. One research representation.</h2>
                    <p>
                      Linked synthetic sample IDs prevent combining unrelated
                      records.
                    </p>
                  </div>
                  <BrainCircuit size={28} />
                </div>
                <div className="fusion-flow">
                  <div>
                    <ImageIcon size={28} />
                    <strong>Image features</strong>
                    <span>16 → 8 projection</span>
                  </div>
                  <ArrowRight />
                  <div className="fusion-core">
                    <BrainCircuit size={30} />
                    <strong>Feature concatenation</strong>
                    <span>16-dimensional fusion</span>
                  </div>
                  <ArrowRight />
                  <div>
                    <FileText size={28} />
                    <strong>Text features</strong>
                    <span>16 → 8 projection</span>
                  </div>
                </div>
                <label>
                  Linked synthetic sample ID
                  <input
                    id="sample-id"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={1}
                  />
                </label>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      requireSession();
                      const sample_id = Number(
                        (
                          document.getElementById(
                            "sample-id",
                          ) as HTMLInputElement
                        ).value,
                      );
                      setResult(
                        await api("/multimodal/analyze", "POST", { sample_id }),
                      );
                    })
                  }
                >
                  <Play size={16} />
                  {busy
                    ? "Training baseline & analyzing…"
                    : "Run linked sample analysis"}
                </button>
              </section>
              {result && (
                <section className="card">
                  <h2>{result.sample_id} · synthetic class 1 probabilities</h2>
                  <div className="metrics">
                    {Object.entries(result.scores).map(([k, v]) => (
                      <article className="metric" key={k}>
                        <span>{k.replaceAll("_", " ")}</span>
                        <strong>{pct(Number(v))}</strong>
                      </article>
                    ))}
                  </div>
                  <p>{result.notice}</p>
                  <p>
                    Known synthetic label: {result.synthetic_label} ·{" "}
                    {result.model}
                  </p>
                </section>
              )}
            </>
          )}
          {module === "federated" && (
            <div className="training-grid">
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>Experiment configuration</h2>
                    <p>Real local optimization, actual parameter aggregation</p>
                  </div>
                </div>
                <form
                  className="form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      requireSession();
                      const exp = await api(
                        "/federated/experiments",
                        "POST",
                        config,
                      );
                      await api(
                        `/federated/experiments/${exp.id}/start`,
                        "POST",
                      );
                      setJob({
                        ...exp,
                        status: "running",
                        metrics: [],
                        round: 0,
                      });
                      setNotice(
                        "Federated training started on the Python backend.",
                      );
                    });
                  }}
                >
                  <label className="wide">
                    Experiment name
                    <input
                      required
                      value={config.name}
                      onChange={(e) =>
                        setConfig({ ...config, name: e.target.value })
                      }
                    />
                  </label>
                  {[
                    ["rounds", 1, 50],
                    ["epochs", 1, 10],
                    ["batch_size", 4, 128],
                    ["learning_rate", 0.001, 1],
                    ["noise", 0, 2],
                    ["clip_norm", 0.01, 10],
                  ].map(([k, min, max]) => (
                    <label key={String(k)}>
                      {String(k).replaceAll("_", " ")}
                      <input
                        type="number"
                        required
                        min={Number(min)}
                        max={Number(max)}
                        step={
                          ["noise", "learning_rate", "clip_norm"].includes(
                            String(k),
                          )
                            ? 0.001
                            : 1
                        }
                        value={config[k]}
                        onChange={(e) =>
                          setConfig({ ...config, [k]: Number(e.target.value) })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Aggregation
                    <select
                      value={config.strategy}
                      onChange={(e) =>
                        setConfig({ ...config, strategy: e.target.value })
                      }
                    >
                      <option>FedAvg</option>
                      <option>FedProx</option>
                    </select>
                  </label>
                  <label>
                    Modality
                    <select
                      value={config.modality}
                      onChange={(e) =>
                        setConfig({ ...config, modality: e.target.value })
                      }
                    >
                      <option value="multimodal">Multimodal</option>
                      <option value="image">Image only</option>
                      <option value="text">Text only</option>
                    </select>
                  </label>
                  <button
                    className="primary wide"
                    disabled={
                      busy || ["running", "paused"].includes(job?.status)
                    }
                  >
                    <Play size={16} />
                    {busy ? "Starting…" : "Start federated experiment"}
                  </button>
                </form>
                <p className="helper">
                  PyTorch in-process fallback · non-IID synthetic features · 180
                  held-out samples. Batch clipping and noise are educational,
                  without a formal DP guarantee.
                </p>
              </section>
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>Live training monitor</h2>
                    <p>
                      {job
                        ? `Experiment #${job.id} · ${job.status}`
                        : "No active experiment"}
                    </p>
                  </div>
                  <span className="tag">
                    {job?.round || 0} / {job?.config?.rounds || config.rounds}
                  </span>
                </div>
                <Chart data={job?.metrics || []} />
                {job && (
                  <>
                    <div className="progress">
                      <div
                        style={{
                          width: `${(job.round / job.config.rounds) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="card-actions">
                      {["pause", "resume", "stop"].map((a) => (
                        <button
                          key={a}
                          className="secondary"
                          disabled={
                            busy ||
                            !(a === "resume"
                              ? job.status === "paused"
                              : job.status === "running" ||
                                (a === "stop" && job.status === "paused"))
                          }
                          onClick={() =>
                            act(async () => {
                              const r = await api(
                                `/federated/experiments/${job.id}/${a}`,
                                "POST",
                              );
                              setJob({ ...job, status: r.status });
                            })
                          }
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    {job.error && <p role="alert">{job.error}</p>}
                    <Table
                      rows={job.metrics || []}
                      columns={[
                        "round",
                        "accuracy",
                        "loss",
                        "f1",
                        "aggregation_seconds",
                      ]}
                    />
                  </>
                )}
              </section>
            </div>
          )}
          {module === "privacy" && (
            <>
              <div className="metrics">
                {[
                  ["Raw data in updates", "0 bytes"],
                  [
                    "Model update transfer",
                    `${result?.update_bytes || 0} bytes`,
                  ],
                  ["Privacy accountant", "Unavailable"],
                  ["Clinical validation", "Research only"],
                ].map(([a, b]) => (
                  <article className="metric" key={a}>
                    <span>{a}</span>
                    <strong className="smaller">{b}</strong>
                  </article>
                ))}
              </div>
              <div className="analysis-grid">
                <section className="card">
                  <h2>Educational privacy mechanism</h2>
                  <p>
                    Batch gradients are clipped and optional Gaussian noise is
                    added. This is not per-example DP-SGD and does not provide a
                    formal privacy guarantee.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        requireSession();
                        await api("/privacy/configuration", "PUT", {
                          noise: config.noise,
                          clip_norm: config.clip_norm,
                        });
                        setNotice(
                          "Privacy defaults saved. Use these values in the next experiment configuration.",
                        );
                        setResult(await api("/privacy/status"));
                      });
                    }}
                  >
                    <label>
                      Noise multiplier
                      <input
                        type="number"
                        min={0}
                        max={2}
                        step={0.01}
                        value={config.noise}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            noise: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Gradient clipping norm
                      <input
                        type="number"
                        min={0.01}
                        max={10}
                        step={0.01}
                        value={config.clip_norm}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            clip_norm: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <button className="primary" disabled={busy}>
                      Save privacy defaults
                    </button>
                  </form>
                </section>
                <section className="card">
                  <h2>Scope & limitations</h2>
                  <div className="safeguards">
                    {[
                      "Model updates can leak training information.",
                      "Simulated clients share a Python process; this is not network isolation.",
                      "Regex de-identification does not catch every patient identifier.",
                      "Use only synthetic or authorized non-sensitive research data.",
                      "No HIPAA, regulatory, or clinical accuracy claim is made.",
                    ].map((t) => (
                      <div key={t}>
                        <ShieldCheck size={19} />
                        <p>{t}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
          {module === "evaluation" && (
            <>
              <div className="section-toolbar">
                <span>
                  Metrics from actual predictions on 180 held-out synthetic
                  samples
                </span>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      requireSession();
                      await api("/evaluation/run", "POST", {});
                      setRows(await api("/evaluation/results"));
                      await refresh();
                      setNotice(
                        "Three federated modality baselines trained and evaluated.",
                      );
                    })
                  }
                >
                  <FlaskConical size={16} />
                  {busy ? "Training & evaluating…" : "Run modality comparison"}
                </button>
              </div>
              <section className="card">
                <Table
                  rows={filtered}
                  columns={[
                    "modality",
                    "accuracy",
                    "precision",
                    "recall",
                    "f1",
                    "auc",
                    "loss",
                    "samples",
                  ]}
                />
              </section>
              {filtered.map((r) => (
                <section className="card" key={r.id}>
                  <h2>{r.modality} · confusion matrix</h2>
                  <p>
                    {r.split} · Rows: actual class; columns: predicted class
                  </p>
                  <div className="matrix">
                    {r.confusion_matrix?.flat().map((v: number, i: number) => (
                      <div key={i}>
                        <small>
                          {i < 2 ? "Actual 0" : "Actual 1"} / Predicted {i % 2}
                        </small>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
          {module === "datasets" && (
            <>
              <section className="card">
                <h2>Register a synthetic dataset catalog entry</h2>
                <p>
                  Catalog records describe datasets. Training uses locally
                  generated synthetic features.
                </p>
                <form
                  className="form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    act(async () => {
                      requireSession();
                      await api("/datasets", "POST", {
                        name: d.get("name"),
                        hospital_id: Number(d.get("hospital_id")),
                        modality: d.get("modality"),
                        samples: Number(d.get("samples")),
                      });
                      setRows(await api("/datasets"));
                      setNotice("Synthetic dataset registered.");
                    });
                  }}
                >
                  <label>
                    Name
                    <input name="name" required minLength={3} />
                  </label>
                  <label>
                    Hospital
                    <select name="hospital_id">
                      {hs.map((h: Row) => (
                        <option value={h.id} key={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Modality
                    <select name="modality">
                      {["MRI", "CT", "X-ray", "Clinical text"].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sample count
                    <input
                      name="samples"
                      type="number"
                      defaultValue={80}
                      min={1}
                      max={100000}
                      required
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    <Plus size={16} />
                    Register dataset
                  </button>
                </form>
              </section>
              <section className="card">
                <Table
                  rows={filtered}
                  columns={[
                    "id",
                    "name",
                    "hospital_id",
                    "modality",
                    "samples",
                    "created_at",
                  ]}
                />
                <div className="card-actions">
                  {filtered.map((r) => (
                    <button
                      className="danger-link"
                      key={r.id}
                      onClick={() => {
                        if (confirm(`Delete ${r.name}?`))
                          act(async () => {
                            await api(`/datasets/${r.id}`, "DELETE");
                            setRows(await api("/datasets"));
                          });
                      }}
                    >
                      Delete {r.name}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {module === "training-history" && (
            <section className="card">
              <h2>Experiment history</h2>
              <Table
                rows={filtered.map((r) => ({
                  ...r,
                  name: r.config?.name,
                  strategy: r.config?.strategy,
                  modality: r.config?.modality,
                }))}
                columns={[
                  "id",
                  "name",
                  "strategy",
                  "modality",
                  "status",
                  "round",
                  "created_at",
                ]}
              />
            </section>
          )}
          {module === "analytics" && (
            <>
              <div className="report-grid">
                {[
                  ["json", "Complete research snapshot"],
                  ["csv", "Model evaluation table"],
                  ["pdf", "Shareable research report"],
                ].map(([f, label]) => (
                  <section className="card report-card" key={f}>
                    <div className="large-icon">
                      <FileText size={27} />
                    </div>
                    <span className="eyebrow">{f.toUpperCase()} EXPORT</span>
                    <h2>{label}</h2>
                    <p>
                      Generated from stored experiment records and measured
                      results.
                    </p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => act(() => exportReport(f))}
                    >
                      <ArrowDownToLine size={16} />
                      Download {f.toUpperCase()}
                    </button>
                  </section>
                ))}
              </div>
              <section className="card">
                <h2>Export history</h2>
                <Table
                  rows={filtered}
                  columns={["id", "format", "bytes", "created_at"]}
                />
              </section>
            </>
          )}
          {module === "audit-logs" && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>Research audit trail</h2>
                  <p>Metadata only. Raw clinical contents are never logged.</p>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      new Blob([JSON.stringify(filtered, null, 2)], {
                        type: "application/json",
                      }),
                      "audit-log.json",
                    )
                  }
                >
                  <ArrowDownToLine size={15} />
                  Export view
                </button>
              </div>
              <Table
                rows={filtered}
                columns={[
                  "id",
                  "action",
                  "user",
                  "resource",
                  "created_at",
                  "status",
                ]}
              />
            </section>
          )}
          {module === "settings" && (
            <div className="analysis-grid">
              <section className="card">
                <h2>Backend connection</h2>
                <p>
                  The Vercel frontend connects to a separately hosted Python
                  API. Training runs on the Python server.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const url = new URL(base);
                      if (!["http:", "https:"].includes(url.protocol))
                        throw Error("Use an HTTP or HTTPS API URL");
                      localStorage.setItem("medifed.api", base);
                      await api("/health");
                      await refresh();
                      setNotice("Backend URL saved and health check passed.");
                    });
                  }}
                >
                  <label>
                    Python API URL
                    <input
                      type="url"
                      required
                      value={base}
                      onChange={(e) => setBase(e.target.value)}
                      placeholder="https://your-python-api.example.com"
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    <RefreshCw size={16} />
                    Save & test connection
                  </button>
                </form>
                <div className="code-block">
                  cd backend
                  <br />
                  python -m uvicorn app.main:app --reload
                </div>
                <p className="helper">
                  For deployment, set NEXT_PUBLIC_API_URL in Vercel and set
                  CORS_ORIGINS on the backend to your frontend origin.
                </p>
              </section>
              <section className="card">
                <h2>Account & environment</h2>
                <dl>
                  <div>
                    <dt>Backend</dt>
                    <dd>{online ? "Connected" : "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Account</dt>
                    <dd>{user?.email || "Not signed in"}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{user?.role || "Guest preview"}</dd>
                  </div>
                  <div>
                    <dt>Training engine</dt>
                    <dd>PyTorch · in-process federation</dd>
                  </div>
                  <div>
                    <dt>Data environment</dt>
                    <dd>Synthetic research</dd>
                  </div>
                </dl>
                <Link href="/login" className="primary">
                  Sign in <ArrowRight size={16} />
                </Link>
                {token && (
                  <button
                    className="secondary"
                    onClick={() =>
                      act(async () => {
                        try {
                          await api("/auth/logout", "POST");
                        } finally {
                          sessionStorage.removeItem("medifed.token");
                          setToken("");
                          setUser(null);
                          setNotice("Signed out.");
                        }
                      })
                    }
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                )}
              </section>
            </div>
          )}
          <footer>
            <span>
              <Activity size={14} /> MediFed AI <b>·</b> Privacy-aware research,
              connected.
            </span>
            <span>
              In-process federation <b>·</b> Synthetic data only
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
