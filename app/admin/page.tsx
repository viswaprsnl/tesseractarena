"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import {
  Shield,
  Calendar,
  Users,
  IndianRupee,
  XCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Gamepad2,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatTimeDisplay } from "@/lib/booking-config";
import type { BookingRow } from "@/lib/booking-types";
import { allGames, anvioGames, synthesisGames, type Game } from "@/data/games";

type GameStatus = "available" | "unavailable" | "coming_soon" | "maintenance";

const STATUS_CONFIG: Record<GameStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-500/20 text-green-400" },
  unavailable: { label: "Unavailable", color: "bg-red-500/20 text-red-400" },
  coming_soon: { label: "Coming Soon", color: "bg-blue-500/20 text-blue-400" },
  maintenance: { label: "Maintenance", color: "bg-amber-500/20 text-amber-400" },
};

interface Stats {
  total: number;
  active: number;
  cancelled: number;
  paid: number;
  payAtCenter: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [waiverCheck, setWaiverCheck] = useState<Record<string, boolean | null>>({});
  const [activeTab, setActiveTab] = useState<"bookings" | "games">("bookings");
  const [gameStatuses, setGameStatuses] = useState<Record<string, { status: GameStatus; note: string; videoUrl?: string; hidden?: boolean }>>({});
  const [gameProvider, setGameProvider] = useState<"all" | "anvio" | "synthesis">("all");
  const [gameSearch, setGameSearch] = useState("");
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [customGames, setCustomGames] = useState<Game[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [gameStatusFilter, setGameStatusFilter] = useState<"all" | GameStatus>("all");
  const [updatingGame, setUpdatingGame] = useState<string | null>(null);

  const fetchGameStatuses = useCallback(async (authPin: string) => {
    try {
      const res = await fetch(`/api/admin/games?pin=${authPin}`);
      const data = await res.json();
      if (data.statuses) setGameStatuses(data.statuses);
      if (data.customGames) {
        setCustomGames(data.customGames.map((g: Record<string, string>) => ({
          id: g.id, title: g.title, provider: g.provider as "anvio" | "synthesis",
          description: g.description, players: g.players, genre: g.genre,
          duration: g.duration, difficulty: g.difficulty, image: g.image,
          videoUrl: g.videoUrl, tags: (g.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
        })));
      }
    } catch {
      // Silently fail
    }
  }, []);

  const toggleGameHidden = async (gameId: string, currentlyHidden: boolean) => {
    const gs = gameStatuses[gameId];
    const status = (gs?.status as GameStatus) || "available";
    const note = gs?.note || "";
    setUpdatingGame(gameId);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, gameId, status, note, hidden: !currentlyHidden }),
      });
      const data = await res.json();
      if (data.success) {
        setGameStatuses((prev) => ({ ...prev, [gameId]: { ...prev[gameId], status, note, hidden: !currentlyHidden } }));
      }
    } catch { setError("Failed to update"); }
    setUpdatingGame(null);
  };

  const addCustomGame = async (newGame: Record<string, string>) => {
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: "add_game", newGame }),
      });
      const data = await res.json();
      if (data.success) {
        fetchGameStatuses(pin);
        setShowAddForm(false);
      }
    } catch { setError("Failed to add game"); }
  };

  const deleteCustomGame = async (gameId: string) => {
    if (!confirm("Delete this game permanently?")) return;
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, gameId, action: "delete_game" }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomGames((prev) => prev.filter((g) => g.id !== gameId));
      }
    } catch { setError("Failed to delete game"); }
  };

  const updateGameStatus = async (gameId: string, status: GameStatus, note: string, videoUrl?: string) => {
    setUpdatingGame(gameId);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, gameId, status, note, videoUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setGameStatuses((prev) => ({
          ...prev,
          [gameId]: { status, note, videoUrl: data.videoUrl || prev[gameId]?.videoUrl || "" },
        }));
      }
    } catch {
      setError("Failed to update game status");
    }
    setUpdatingGame(null);
  };

  const checkAllWaivers = useCallback(async (bookingList: BookingRow[]) => {
    const emails = [...new Set(bookingList.filter(b => b.status !== "cancelled").map(b => b.email))];
    const results: Record<string, boolean | null> = {};
    await Promise.all(
      emails.map(async (email) => {
        try {
          const res = await fetch(`/api/waiver?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          results[email] = data.signed;
        } catch {
          results[email] = null;
        }
      })
    );
    setWaiverCheck(results);
  }, []);

  const fetchBookings = useCallback(
    async (date: string, authPin: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/bookings?date=${date}&pin=${authPin}`
        );
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          if (res.status === 401) setAuthenticated(false);
        } else {
          setBookings(data.bookings);
          setStats(data.stats);
          checkAllWaivers(data.bookings);
        }
      } catch {
        setError("Failed to fetch bookings");
      }
      setLoading(false);
    },
    [checkAllWaivers]
  );

  const handleLogin = async () => {
    setAuthenticated(true);
    fetchBookings(selectedDate, pin);
    fetchGameStatuses(pin);
  };

  const handleDateChange = (offset: number) => {
    const newDate = format(
      addDays(new Date(selectedDate + "T00:00:00"), offset),
      "yyyy-MM-dd"
    );
    setSelectedDate(newDate);
    fetchBookings(newDate, pin);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm(`Cancel booking ${bookingId}? This will free up the slot and notify the customer.`)) return;

    setCancelling(bookingId);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings(selectedDate, pin);
      } else {
        setError(data.error || "Failed to cancel");
      }
    } catch {
      setError("Failed to cancel booking");
    }
    setCancelling(null);
  };

  if (!authenticated) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 sm:p-10 max-w-sm w-full text-center"
        >
          <Shield size={40} className="mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-bold mb-2">Staff Login</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter admin PIN to access bookings
          </p>
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="bg-card/60 border-white/10 text-center text-lg tracking-widest mb-4"
          />
          {error && (
            <p className="text-xs text-destructive mb-4">{error}</p>
          )}
          <Button
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Login
          </Button>
        </motion.div>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status !== "cancelled");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  return (
    <div className="pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            <span className="gradient-text">Admin Panel</span>
          </h1>
          <Button
            variant="outline"
            onClick={() => {
              setAuthenticated(false);
              setPin("");
            }}
            className="border-white/20 text-sm"
          >
            Logout
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "bookings"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar size={16} />
            Bookings
          </button>
          <button
            onClick={() => { setActiveTab("games"); fetchGameStatuses(pin); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "games"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gamepad2 size={16} />
            Games
          </button>
        </div>

        {activeTab === "games" && (
          <div className="space-y-3 mb-8">
            <h2 className="font-heading text-lg font-bold mb-4">Game Status Management</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Set game availability. Changes are reflected immediately on the website and booking form.
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="pl-9 bg-card/60 border-white/10"
              />
            </div>

            {/* Provider tabs */}
            <div className="flex gap-2 mb-6">
              {([
                { key: "all", label: "All Games", count: allGames.length },
                { key: "anvio", label: "Anvio VR", count: anvioGames.length },
                { key: "synthesis", label: "Synthesis VR", count: synthesisGames.length },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setGameProvider(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    gameProvider === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Status filter tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                { key: "all", label: "All", color: "bg-secondary/50 text-muted-foreground" },
                { key: "available", label: "✅ Available", color: "bg-green-500/20 text-green-400" },
                { key: "unavailable", label: "❌ Unavailable", color: "bg-red-500/20 text-red-400" },
                { key: "maintenance", label: "🔧 Maintenance", color: "bg-amber-500/20 text-amber-400" },
                { key: "coming_soon", label: "🔜 Coming Soon", color: "bg-blue-500/20 text-blue-400" },
              ] as const).map((tag) => {
                const count = tag.key === "all"
                  ? allGames.filter((g) => gameProvider === "all" || g.provider === gameProvider).length
                  : allGames
                      .filter((g) => gameProvider === "all" || g.provider === gameProvider)
                      .filter((g) => {
                        const gs = gameStatuses[g.id];
                        const s = (gs?.status as GameStatus) || "available";
                        return s === tag.key;
                      }).length;

                if (tag.key !== "all" && count === 0) return null;

                return (
                  <button
                    key={tag.key}
                    onClick={() => setGameStatusFilter(tag.key)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                      gameStatusFilter === tag.key
                        ? `${tag.color} ring-1 ring-white/20`
                        : `${tag.color} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {tag.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Add New Game button */}
            <div className="mb-4">
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
              >
                <Plus size={14} className="mr-1" />
                {showAddForm ? "Cancel" : "Add New Game"}
              </Button>
            </div>

            {/* Add game form */}
            {showAddForm && (
              <div className="glass-card p-5 mb-6 space-y-3">
                <h4 className="text-sm font-bold">Add New Game</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const fd = new FormData(form);
                    addCustomGame({
                      title: fd.get("title") as string,
                      provider: fd.get("provider") as string,
                      description: fd.get("description") as string,
                      players: fd.get("players") as string,
                      genre: fd.get("genre") as string,
                      duration: fd.get("duration") as string,
                      difficulty: fd.get("difficulty") as string,
                      image: fd.get("image") as string,
                      videoUrl: fd.get("videoUrl") as string,
                      tags: fd.get("tags") as string,
                    });
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Input name="title" placeholder="Game title *" required className="bg-card/60 border-white/10 text-xs h-8" />
                    <select name="provider" className="h-8 rounded-md bg-card/60 border border-white/10 px-2 text-xs">
                      <option value="anvio">Anvio VR</option>
                      <option value="synthesis">Synthesis VR</option>
                    </select>
                  </div>
                  <Input name="description" placeholder="Game description" className="bg-card/60 border-white/10 text-xs h-8" />
                  <div className="grid grid-cols-4 gap-3">
                    <Input name="players" placeholder="Players (1-4)" defaultValue="1-4" className="bg-card/60 border-white/10 text-xs h-8" />
                    <Input name="genre" placeholder="Genre *" required className="bg-card/60 border-white/10 text-xs h-8" />
                    <Input name="duration" placeholder="Duration" defaultValue="30 min" className="bg-card/60 border-white/10 text-xs h-8" />
                    <select name="difficulty" className="h-8 rounded-md bg-card/60 border border-white/10 px-2 text-xs">
                      <option value="Easy">Easy</option>
                      <option value="Medium" selected>Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <Input name="image" placeholder="Image URL (paste thumbnail link)" className="bg-card/60 border-white/10 text-xs h-8" />
                  <Input name="videoUrl" placeholder="Video URL (YouTube or MP4)" className="bg-card/60 border-white/10 text-xs h-8" />
                  <Input name="tags" placeholder="Tags (comma-separated: action, co-op, shooter)" className="bg-card/60 border-white/10 text-xs h-8" />
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                    Add Game
                  </Button>
                </form>
              </div>
            )}

            {[...allGames, ...customGames]
              .filter((g) => gameProvider === "all" || g.provider === gameProvider)
              .filter((g) => {
                if (gameStatusFilter === "all") return true;
                const gs = gameStatuses[g.id];
                const s = (gs?.status as GameStatus) || "available";
                return s === gameStatusFilter;
              })
              .filter((g) =>
                gameSearch === "" ||
                g.title.toLowerCase().includes(gameSearch.toLowerCase()) ||
                g.genre.toLowerCase().includes(gameSearch.toLowerCase())
              )
              .map((game) => {
              const isCustom = game.id.startsWith("custom-");
              const gs = gameStatuses[game.id];
              const currentStatus: GameStatus = (gs?.status as GameStatus) || "available";
              const currentNote = gs?.note || "";
              const config = STATUS_CONFIG[currentStatus];

              return (
                <div key={game.id} className="glass-card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{game.title}</span>
                        <Badge className={`text-[10px] ${config.color}`}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {game.provider}
                        </span>
                        {isCustom && (
                          <Badge className="text-[9px] bg-purple-500/20 text-purple-400">Custom</Badge>
                        )}
                        {gs?.hidden && (
                          <Badge className="text-[9px] bg-red-500/20 text-red-400">Hidden</Badge>
                        )}
                      </div>
                      {currentNote && editingGame !== game.id && (
                        <p className="text-xs text-amber-400/80 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {currentNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={currentStatus}
                        onChange={(e) => {
                          const newStatus = e.target.value as GameStatus;
                          if (newStatus === "available") {
                            updateGameStatus(game.id, newStatus, "");
                            setEditingGame(null);
                          } else {
                            setEditingGame(game.id);
                            setEditNote(currentNote);
                          }
                        }}
                        disabled={updatingGame === game.id}
                        className="h-8 rounded-md bg-card/60 border border-white/10 px-2 text-xs"
                      >
                        <option value="available">✅ Available</option>
                        <option value="unavailable">❌ Unavailable</option>
                        <option value="coming_soon">🔜 Coming Soon</option>
                        <option value="maintenance">🔧 Maintenance</option>
                      </select>
                      {updatingGame === game.id && (
                        <Loader2 size={14} className="animate-spin text-primary" />
                      )}
                      <button
                        onClick={() => toggleGameHidden(game.id, gs?.hidden || false)}
                        title={gs?.hidden ? "Show on website" : "Hide from website"}
                        className={`p-1.5 rounded-md transition-colors ${
                          gs?.hidden
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {gs?.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => deleteCustomGame(game.id)}
                          title="Delete game"
                          className="p-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline note editor */}
                  {editingGame === game.id && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Add a note (optional) e.g. Headset repair until Friday"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="bg-card/60 border-white/10 text-xs h-8 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const statusToSave = currentStatus === "available" ? "unavailable" : currentStatus;
                            updateGameStatus(game.id, statusToSave, editNote);
                            setEditingGame(null);
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          const statusToSave = currentStatus === "available" ? "unavailable" : currentStatus;
                          updateGameStatus(game.id, statusToSave, editNote);
                          setEditingGame(null);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 px-3"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingGame(null)}
                        variant="outline"
                        className="border-white/20 text-xs h-8 px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Video URL */}
                  <div className="mt-2 flex gap-2 items-center">
                    <Input
                      placeholder="YouTube video URL (paste link)"
                      defaultValue={gs?.videoUrl || ""}
                      onBlur={(e) => {
                        const newUrl = e.target.value.trim();
                        const oldUrl = gs?.videoUrl || "";
                        if (newUrl !== oldUrl) {
                          updateGameStatus(game.id, currentStatus, currentNote, newUrl);
                        }
                      }}
                      className="bg-card/60 border-white/10 text-[11px] h-7 flex-1"
                    />
                    {gs?.videoUrl && (
                      <a
                        href={gs.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline shrink-0"
                      >
                        Preview ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "bookings" && <>
        {/* Date navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchBookings(e.target.value, pin);
              }}
              className="bg-transparent border-none text-center font-heading text-lg tracking-wider cursor-pointer"
            />
          </div>
          <button
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="glass-card p-4 text-center">
              <Calendar size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Users size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {activeBookings.reduce((s, b) => s + b.partySize, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="glass-card p-4 text-center">
              <IndianRupee size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
            <div className="glass-card p-4 text-center">
              <CheckCircle2 size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.paid}</p>
              <p className="text-xs text-muted-foreground">Paid Online</p>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-card p-4 mb-6 border-destructive/30 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {/* Active bookings */}
            {activeBookings.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Calendar size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No bookings for this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBookings.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="glass-card p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-heading text-sm font-bold text-primary">
                            {booking.bookingId}
                          </span>
                          <Badge
                            className={
                              booking.paymentStatus === "paid"
                                ? "bg-green-500/20 text-green-400 text-[10px]"
                                : "bg-amber-500/20 text-amber-400 text-[10px]"
                            }
                          >
                            {booking.paymentStatus === "paid"
                              ? "Paid"
                              : "Pay at Center"}
                          </Badge>
                          {/* Waiver status */}
                          {waiverCheck[booking.email] === undefined ? (
                            <Badge className="bg-muted/30 text-muted-foreground text-[10px]">
                              Checking...
                            </Badge>
                          ) : waiverCheck[booking.email] ? (
                            <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                              Waiver ✓
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                              No Waiver ✕
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{booking.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatTimeDisplay(booking.timeSlot)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {booking.partySize} players
                          </span>
                          <span>
                            {booking.package} · ₹
                            {booking.amount.toLocaleString("en-IN")}
                          </span>
                          <span>{booking.phone}</span>
                        </div>
                        {booking.gamePreference && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Game: {booking.gamePreference}
                          </p>
                        )}
                        {booking.specialRequests && (
                          <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {booking.specialRequests}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => handleCancel(booking.bookingId)}
                        disabled={cancelling === booking.bookingId}
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs shrink-0"
                      >
                        {cancelling === booking.bookingId ? (
                          <Loader2 size={14} className="animate-spin mr-1" />
                        ) : (
                          <XCircle size={14} className="mr-1" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cancelled bookings */}
            {cancelledBookings.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm text-muted-foreground mb-3">
                  Cancelled ({cancelledBookings.length})
                </h3>
                <div className="space-y-2">
                  {cancelledBookings.map((booking) => (
                    <div
                      key={booking.bookingId}
                      className="glass-card p-3 opacity-50"
                    >
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-heading text-muted-foreground line-through">
                          {booking.bookingId}
                        </span>
                        <span>{booking.name}</span>
                        <span>{formatTimeDisplay(booking.timeSlot)}</span>
                        <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                          Cancelled
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </>}
      </div>
    </div>
  );
}
