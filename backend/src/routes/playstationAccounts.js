import express from "express";
import {
  addPlaystationAccount,
  addPlaystationGame,
  addPlaystationLibraryGame,
  listPlaystationAccounts,
  listPlaystationLibraryGames,
  removePlaystationAccount,
  removePlaystationGame,
  removePlaystationLibraryGame,
  updatePlaystationAccountStatus
} from "../lib/db.js";

const router = express.Router();
const PLAYSTATION_ACCOUNT_STATUS_OPTIONS = ["Enabled", "Disabled", "Sold", "Active"];
const PLAYSTATION_GAME_STATUS_OPTIONS = ["In Progress", "Completed", "To Be Played"];

function isValidPlaystationAccountStatus(status) {
  return PLAYSTATION_ACCOUNT_STATUS_OPTIONS.includes(status);
}

function isValidPlaystationGameStatus(status) {
  return PLAYSTATION_GAME_STATUS_OPTIONS.includes(status);
}

router.get("/", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();

  try {
    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.json({ playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to load PlayStation accounts." });
  }
});

router.post("/", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "").trim();
  const status = String(req.body?.status || "Active").trim();

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required." });
    return;
  }

  if (!isValidPlaystationAccountStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${PLAYSTATION_ACCOUNT_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    const playstationAccount = await addPlaystationAccount({ userId, email, password, status });
    if (!playstationAccount) {
      res.status(409).json({ error: "A PlayStation account with this email already exists." });
      return;
    }

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.status(201).json({ playstationAccount, playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to create PlayStation account." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const id = String(req.params?.id || "").trim();
  const status = String(req.body?.status || "").trim();

  if (!id || !isValidPlaystationAccountStatus(status)) {
    res.status(400).json({ error: `Account id and valid status are required. status must be one of: ${PLAYSTATION_ACCOUNT_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    const playstationAccount = await updatePlaystationAccountStatus(id, status, userId);
    if (!playstationAccount) {
      res.status(404).json({ error: "PlayStation account not found." });
      return;
    }

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.json({ playstationAccount, playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to update PlayStation account status." });
  }
});

router.post("/:id/games", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const accountId = String(req.params?.id || "").trim();
  const name = String(req.body?.name || "").trim();
  const howLongToBeat = String(req.body?.howLongToBeat || "").trim();
  const imageUrl = String(req.body?.imageUrl || "").trim();
  const releaseYearRaw = req.body?.releaseYear;
  const ignRatingRaw = req.body?.ignRating;
  const releaseYear =
    releaseYearRaw === "" || releaseYearRaw === null || typeof releaseYearRaw === "undefined"
      ? null
      : Number.parseInt(releaseYearRaw, 10);
  const ignRating =
    ignRatingRaw === "" || ignRatingRaw === null || typeof ignRatingRaw === "undefined"
      ? null
      : Number.parseFloat(ignRatingRaw);

  if (!accountId || !name) {
    res.status(400).json({ error: "Account id and game name are required." });
    return;
  }

  if (releaseYear !== null && (!Number.isInteger(releaseYear) || releaseYear < 1950 || releaseYear > 2100)) {
    res.status(400).json({ error: "releaseYear must be a valid year." });
    return;
  }

  if (ignRating !== null && (!Number.isFinite(ignRating) || ignRating < 0 || ignRating > 10)) {
    res.status(400).json({ error: "ignRating must be between 0 and 10." });
    return;
  }

  try {
    const game = await addPlaystationGame({
      accountId,
      userId,
      name,
      releaseYear,
      ignRating,
      howLongToBeat,
      imageUrl
    });

    if (!game) {
      res.status(404).json({ error: "PlayStation account not found." });
      return;
    }

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.status(201).json({ game, playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to add PlayStation game." });
  }
});

router.delete("/:id/games/:gameId", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const accountId = String(req.params?.id || "").trim();
  const gameId = String(req.params?.gameId || "").trim();

  if (!accountId || !gameId) {
    res.status(400).json({ error: "Account id and game id are required." });
    return;
  }

  try {
    const deleted = await removePlaystationGame(gameId, accountId, userId);
    if (!deleted) {
      res.status(404).json({ error: "PlayStation game not found." });
      return;
    }

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.json({ playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete PlayStation game." });
  }
});

router.post("/games", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const name = String(req.body?.name || "").trim();
  const status = String(req.body?.status || "To Be Played").trim();
  const howLongToBeat = String(req.body?.howLongToBeat || "").trim();
  const imageUrl = String(req.body?.imageUrl || "").trim();
  const releaseYearRaw = req.body?.releaseYear;
  const ignRatingRaw = req.body?.ignRating;
  const releaseYear =
    releaseYearRaw === "" || releaseYearRaw === null || typeof releaseYearRaw === "undefined"
      ? null
      : Number.parseInt(releaseYearRaw, 10);
  const ignRating =
    ignRatingRaw === "" || ignRatingRaw === null || typeof ignRatingRaw === "undefined"
      ? null
      : Number.parseFloat(ignRatingRaw);

  if (!name) {
    res.status(400).json({ error: "Game name is required." });
    return;
  }

  if (!isValidPlaystationGameStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${PLAYSTATION_GAME_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  if (releaseYear !== null && (!Number.isInteger(releaseYear) || releaseYear < 1950 || releaseYear > 2100)) {
    res.status(400).json({ error: "releaseYear must be a valid year." });
    return;
  }

  if (ignRating !== null && (!Number.isFinite(ignRating) || ignRating < 0 || ignRating > 10)) {
    res.status(400).json({ error: "ignRating must be between 0 and 10." });
    return;
  }

  try {
    const game = await addPlaystationLibraryGame({
      userId,
      name,
      status,
      releaseYear,
      ignRating,
      howLongToBeat,
      imageUrl
    });

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.status(201).json({ game, playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to add PlayStation game." });
  }
});

router.delete("/games/:gameId", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const gameId = String(req.params?.gameId || "").trim();

  if (!gameId) {
    res.status(400).json({ error: "Game id is required." });
    return;
  }

  try {
    const deleted = await removePlaystationLibraryGame(gameId, userId);
    if (!deleted) {
      res.status(404).json({ error: "PlayStation game not found." });
      return;
    }

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.json({ playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete PlayStation game." });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const id = String(req.params?.id || "").trim();

  if (!id) {
    res.status(400).json({ error: "Account id is required." });
    return;
  }

  try {
    const deleted = await removePlaystationAccount(id, userId);
    if (!deleted) {
      res.status(404).json({ error: "PlayStation account not found." });
      return;
    }

    const playstationAccounts = await listPlaystationAccounts(userId);
    const playstationGames = await listPlaystationLibraryGames(userId);
    res.json({ playstationAccounts, playstationGames });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete PlayStation account." });
  }
});

export default router;
