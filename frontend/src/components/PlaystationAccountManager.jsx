import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const PLAYSTATION_ACCOUNT_STATUS_OPTIONS = ["Enabled", "Disabled", "Sold", "Active"];
const PLAYSTATION_LIBRARY_STATUS_OPTIONS = ["In Progress", "Completed", "To Be Played"];

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  if (!visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A3 3 0 0 0 14 14" />
        <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5.3 0 9.3 4.1 10 7-.3 1.1-1.1 2.6-2.4 4" />
        <path d="M6.2 6.3C3.8 8 2.4 10.4 2 12c.7 2.9 4.7 7 10 7 1.7 0 3.2-.4 4.5-1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function formatCreatedAt(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatIgnRating(value) {
  if (value === null || typeof value === "undefined" || value === "") {
    return "-";
  }

  return Number(value).toFixed(1);
}

function getStatusClass(status) {
  if (status === "Sold") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "Disabled") {
    return "bg-rose-100 text-rose-800";
  }
  if (status === "Enabled") {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-cyan-100 text-cyan-800";
}

function getEmptyAccountForm() {
  return {
    email: "",
    password: "",
    status: "Active"
  };
}

function getEmptyAccountGameForm() {
  return {
    name: "",
    releaseYear: "",
    ignRating: "",
    howLongToBeat: "",
    imageUrl: ""
  };
}

function getEmptyLibraryGameForm() {
  return {
    name: "",
    status: "To Be Played",
    releaseYear: "",
    ignRating: "",
    howLongToBeat: "",
    imageUrl: ""
  };
}

function GameCard({ game, onDelete, hideStatus = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[16/9] bg-slate-100">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt={game.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900">{game.name}</h4>
            {!hideStatus && game.status ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {game.status}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">Added {formatCreatedAt(game.createdAt)}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Release year</dt>
            <dd className="font-medium text-slate-800">{game.releaseYear || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">IGN rating</dt>
            <dd className="font-medium text-slate-800">{formatIgnRating(game.ignRating)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">How long to beat</dt>
            <dd className="font-medium text-slate-800">{game.howLongToBeat || "-"}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
        >
          Delete Game
        </button>
      </div>
    </div>
  );
}

function PlaystationAccountManager() {
  const [accounts, setAccounts] = useState([]);
  const [libraryGames, setLibraryGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [statusSavingById, setStatusSavingById] = useState({});

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(getEmptyAccountForm());

  const [accountGameDialogAccountId, setAccountGameDialogAccountId] = useState("");
  const [isSavingAccountGame, setIsSavingAccountGame] = useState(false);
  const [accountGameForm, setAccountGameForm] = useState(getEmptyAccountGameForm());

  const [isLibraryGameDialogOpen, setIsLibraryGameDialogOpen] = useState(false);
  const [isSavingLibraryGame, setIsSavingLibraryGame] = useState(false);
  const [libraryGameForm, setLibraryGameForm] = useState(getEmptyLibraryGameForm());

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getPlaystationAccounts();
        if (!isActive) {
          return;
        }
        setAccounts(Array.isArray(data?.playstationAccounts) ? data.playstationAccounts : []);
        setLibraryGames(Array.isArray(data?.playstationGames) ? data.playstationGames : []);
        setError("");
      } catch (_error) {
        if (isActive) {
          setAccounts([]);
          setLibraryGames([]);
          setError("Failed to load PlayStation data.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!copiedField) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopiedField("");
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [copiedField]);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((left, right) => String(left?.email || "").localeCompare(String(right?.email || "")));
  }, [accounts]);

  const activeAndCompletedLibraryGames = useMemo(() => {
    return libraryGames.filter((game) => game.status === "In Progress" || game.status === "Completed");
  }, [libraryGames]);

  const toBePlayedLibraryGames = useMemo(() => {
    return libraryGames.filter((game) => game.status === "To Be Played");
  }, [libraryGames]);

  const syncData = (payload) => {
    if (Array.isArray(payload?.playstationAccounts)) {
      setAccounts(payload.playstationAccounts);
    }
    if (Array.isArray(payload?.playstationGames)) {
      setLibraryGames(payload.playstationGames);
    }
  };

  const copyValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setError("");
    } catch (_error) {
      setError("Copy failed. Your browser may not allow clipboard access.");
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((current) => ({ ...current, [id]: !current[id] }));
  };

  const toggleSection = (key) => {
    setCollapsedSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const isCollapsed = (key) => {
    return typeof collapsedSections[key] === "undefined" ? true : collapsedSections[key];
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    const email = accountForm.email.trim();
    const password = accountForm.password.trim();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSavingAccount(true);
    setError("");
    try {
      const data = await api.addPlaystationAccount({ email, password, status: accountForm.status });
      syncData(data);
      setIsAccountDialogOpen(false);
      setAccountForm(getEmptyAccountForm());
    } catch (requestError) {
      setError(requestError?.message || "Failed to save PlayStation account.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const updateStatus = async (accountId, status) => {
    setStatusSavingById((current) => ({ ...current, [accountId]: true }));
    try {
      const data = await api.updatePlaystationAccountStatus(accountId, status);
      syncData(data);
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "Failed to update PlayStation account status.");
    } finally {
      setStatusSavingById((current) => ({ ...current, [accountId]: false }));
    }
  };

  const deleteAccount = async (accountId) => {
    try {
      const data = await api.deletePlaystationAccount(accountId);
      syncData(data);
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "Failed to delete PlayStation account.");
    }
  };

  const saveAccountGame = async (event) => {
    event.preventDefault();
    const name = accountGameForm.name.trim();
    if (!accountGameDialogAccountId || !name) {
      setError("Game name is required.");
      return;
    }

    setIsSavingAccountGame(true);
    setError("");
    try {
      const data = await api.addPlaystationGame(accountGameDialogAccountId, {
        name,
        releaseYear: accountGameForm.releaseYear.trim(),
        ignRating: accountGameForm.ignRating.trim(),
        howLongToBeat: accountGameForm.howLongToBeat.trim(),
        imageUrl: accountGameForm.imageUrl.trim()
      });
      syncData(data);
      setAccountGameDialogAccountId("");
      setAccountGameForm(getEmptyAccountGameForm());
    } catch (requestError) {
      setError(requestError?.message || "Failed to add account game.");
    } finally {
      setIsSavingAccountGame(false);
    }
  };

  const deleteAccountGame = async (accountId, gameId) => {
    try {
      const data = await api.deletePlaystationGame(accountId, gameId);
      syncData(data);
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "Failed to delete account game.");
    }
  };

  const saveLibraryGame = async (event) => {
    event.preventDefault();
    const name = libraryGameForm.name.trim();
    if (!name) {
      setError("Game name is required.");
      return;
    }

    setIsSavingLibraryGame(true);
    setError("");
    try {
      const data = await api.addPlaystationLibraryGame({
        name,
        status: libraryGameForm.status,
        releaseYear: libraryGameForm.releaseYear.trim(),
        ignRating: libraryGameForm.ignRating.trim(),
        howLongToBeat: libraryGameForm.howLongToBeat.trim(),
        imageUrl: libraryGameForm.imageUrl.trim()
      });
      syncData(data);
      setIsLibraryGameDialogOpen(false);
      setLibraryGameForm(getEmptyLibraryGameForm());
    } catch (requestError) {
      setError(requestError?.message || "Failed to add PlayStation game.");
    } finally {
      setIsSavingLibraryGame(false);
    }
  };

  const deleteLibraryGame = async (gameId) => {
    try {
      const data = await api.deletePlaystationLibraryGame(gameId);
      syncData(data);
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "Failed to delete PlayStation game.");
    }
  };

  const accountForGameDialog = sortedAccounts.find((account) => account.id === accountGameDialogAccountId) || null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">PlayStation Accounts</h2>
            <p className="mt-1 text-sm text-slate-600">
              Accounts keep credentials, account status, and a simple list of games linked to that account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAccountForm(getEmptyAccountForm());
              setIsAccountDialogOpen(true);
              setError("");
            }}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Account
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        {copiedField ? <p className="mt-3 text-sm text-emerald-700">{copiedField} copied to clipboard.</p> : null}
        {loading ? <p className="mt-4 text-sm text-slate-500">Loading PlayStation data...</p> : null}

        {!loading ? (
          <div className="mt-6 space-y-5">
            {sortedAccounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No PlayStation accounts saved yet.
              </div>
            ) : (
              sortedAccounts.map((account) => {
                const accountGames = Array.isArray(account.games) ? account.games : [];
                const passwordVisible = Boolean(visiblePasswords[account.id]);

                return (
                  <article key={account.id} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-all font-['Manrope',sans-serif] text-xl font-bold text-slate-900">{account.email}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(account.status)}`}>
                              {account.status || "Active"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>Saved {formatCreatedAt(account.createdAt)}</span>
                            <button
                              type="button"
                              onClick={() => copyValue("Email", account.email)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                              title="Copy email"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded bg-white px-2 py-1 text-xs text-slate-700">
                              {passwordVisible ? account.password : "•".repeat(Math.max(8, String(account.password || "").length))}
                            </code>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(account.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                              title={passwordVisible ? "Hide password" : "Show password"}
                            >
                              <EyeIcon visible={passwordVisible} />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyValue("Password", account.password)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                              title="Copy password"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={account.status || "Active"}
                            onChange={(event) => updateStatus(account.id, event.target.value)}
                            disabled={Boolean(statusSavingById[account.id])}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                          >
                            {PLAYSTATION_ACCOUNT_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setAccountGameForm(getEmptyAccountGameForm());
                              setAccountGameDialogAccountId(account.id);
                              setError("");
                            }}
                            className="rounded-lg border border-cyan-300 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
                          >
                            Add Game To Account
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAccount(account.id)}
                            className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account Games</p>
                        <p className="text-sm text-slate-500">{accountGames.length} saved</p>
                      </div>

                      {accountGames.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No games added for this account yet.
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {accountGames.map((game) => (
                            <GameCard
                              key={game.id}
                              game={game}
                              hideStatus
                              onDelete={() => deleteAccountGame(account.id, game.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">PlayStation Games</h2>
            <p className="mt-1 text-sm text-slate-600">
              This is a separate user-level list for tracking what you are playing, what you finished, and what is next.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLibraryGameForm(getEmptyLibraryGameForm());
              setIsLibraryGameDialogOpen(true);
              setError("");
            }}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Library Game
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => toggleSection("library:active-progress")}
              className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left"
            >
              <div>
                <p className="font-semibold text-slate-900">In Progress / Completed</p>
                <p className="text-sm text-slate-500">{activeAndCompletedLibraryGames.length} games</p>
              </div>
              <span className="text-sm font-medium text-slate-500">{isCollapsed("library:active-progress") ? "Show" : "Hide"}</span>
            </button>
            {!isCollapsed("library:active-progress") ? (
              <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {activeAndCompletedLibraryGames.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No in-progress or completed games yet.
                  </div>
                ) : (
                  activeAndCompletedLibraryGames.map((game) => (
                    <GameCard key={game.id} game={game} onDelete={() => deleteLibraryGame(game.id)} />
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => toggleSection("library:to-be-played")}
              className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left"
            >
              <div>
                <p className="font-semibold text-slate-900">To Be Played</p>
                <p className="text-sm text-slate-500">{toBePlayedLibraryGames.length} games</p>
              </div>
              <span className="text-sm font-medium text-slate-500">{isCollapsed("library:to-be-played") ? "Show" : "Hide"}</span>
            </button>
            {!isCollapsed("library:to-be-played") ? (
              <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {toBePlayedLibraryGames.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No games in the To Be Played list yet.
                  </div>
                ) : (
                  toBePlayedLibraryGames.map((game) => (
                    <GameCard key={game.id} game={game} onDelete={() => deleteLibraryGame(game.id)} />
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isAccountDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-['Manrope',sans-serif] text-xl font-bold">Add PlayStation Account</h3>
                <p className="mt-1 text-sm text-slate-600">Save login details and account status.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountDialogOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={saveAccount}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
                <input
                  type="text"
                  value={accountForm.password}
                  onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                <select
                  value={accountForm.status}
                  onChange={(event) => setAccountForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                >
                  {PLAYSTATION_ACCOUNT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={isSavingAccount}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isSavingAccount ? "Saving..." : "Save Account"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {accountForGameDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-['Manrope',sans-serif] text-xl font-bold">Add Account Game</h3>
                <p className="mt-1 text-sm text-slate-600">Add a game to {accountForGameDialog.email}.</p>
              </div>
              <button
                type="button"
                onClick={() => setAccountGameDialogAccountId("")}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={saveAccountGame}>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Game name</span>
                <input
                  type="text"
                  value={accountGameForm.name}
                  onChange={(event) => setAccountGameForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Release year</span>
                <input
                  type="number"
                  value={accountGameForm.releaseYear}
                  onChange={(event) => setAccountGameForm((current) => ({ ...current, releaseYear: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">IGN rating</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={accountGameForm.ignRating}
                  onChange={(event) => setAccountGameForm((current) => ({ ...current, ignRating: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">How long to beat</span>
                <input
                  type="text"
                  value={accountGameForm.howLongToBeat}
                  onChange={(event) => setAccountGameForm((current) => ({ ...current, howLongToBeat: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Image URL</span>
                <input
                  type="url"
                  value={accountGameForm.imageUrl}
                  onChange={(event) => setAccountGameForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <button
                type="submit"
                disabled={isSavingAccountGame}
                className="sm:col-span-2 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isSavingAccountGame ? "Saving..." : "Save Game"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isLibraryGameDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-['Manrope',sans-serif] text-xl font-bold">Add PlayStation Game</h3>
                <p className="mt-1 text-sm text-slate-600">Add a game to your separate PlayStation tracking lists.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLibraryGameDialogOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={saveLibraryGame}>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Game name</span>
                <input
                  type="text"
                  value={libraryGameForm.name}
                  onChange={(event) => setLibraryGameForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">List</span>
                <select
                  value={libraryGameForm.status}
                  onChange={(event) => setLibraryGameForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                >
                  {PLAYSTATION_LIBRARY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Release year</span>
                <input
                  type="number"
                  value={libraryGameForm.releaseYear}
                  onChange={(event) => setLibraryGameForm((current) => ({ ...current, releaseYear: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">IGN rating</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={libraryGameForm.ignRating}
                  onChange={(event) => setLibraryGameForm((current) => ({ ...current, ignRating: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">How long to beat</span>
                <input
                  type="text"
                  value={libraryGameForm.howLongToBeat}
                  onChange={(event) => setLibraryGameForm((current) => ({ ...current, howLongToBeat: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Image URL</span>
                <input
                  type="url"
                  value={libraryGameForm.imageUrl}
                  onChange={(event) => setLibraryGameForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>
              <button
                type="submit"
                disabled={isSavingLibraryGame}
                className="sm:col-span-2 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isSavingLibraryGame ? "Saving..." : "Save Game"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PlaystationAccountManager;
