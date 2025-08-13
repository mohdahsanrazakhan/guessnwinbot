const express = require('express');
const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
require('dotenv').config();

// Load language file
const langData = JSON.parse(fs.readFileSync("./lang.json", "utf8"));

// Bot token
const token = process.env.YOUR_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

const app = express();
app.use(express.json());

// Webhook setup
// Use Render's URL or your production URL
const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
const port = process.env.PORT || 3000;

// Tell Telegram where to send updates
bot.setWebHook(`${url}/bot${token}`);

// This endpoint will receive updates from Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.send(`
            <!doctype html>
            <html lang="en">
            <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>🎯 Guess N Win Bot</title>
            <style>
            :root {
            --pink: #F0A5C5;
            --lavender: #CCC7F4;
            --light: #E8E8E8;
            --ink: #1C1C1C;
            --bw: 4px;
            --radius: 12px;
            --shadow: 6px 6px 0 var(--ink);
            }
            body {
            margin:0;
            font-family: "Inter", sans-serif;
            background: var(--light);
            color: var(--ink);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            }
            .card {
            background: white;
            border: var(--bw) solid var(--ink);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            padding: 28px 36px;
            text-align: center;
            max-width: 420px;
            }
            h1 {
            font-size: 2rem;
            margin-bottom: 8px;
            }
            p {
            font-size: 1rem;
            margin-bottom: 20px;
            }
            .btn {
            display: inline-block;
            padding: 14px 20px;
            background: var(--pink);
            border: var(--bw) solid var(--ink);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            text-decoration: none;
            color: var(--ink);
            font-weight: 700;
            transition: transform .1s ease, box-shadow .1s ease;
            }
            .btn:hover {
            transform: translate(-3px, -3px);
            box-shadow: 9px 9px 0 var(--ink);
            }
            .footer {
            margin-top: 20px;
            font-size: 0.8rem;
            opacity: 0.8;
            }
            .footer a {
            color: var(--ink);
            text-decoration: none;
            border-bottom: 1px dashed var(--ink);
            }
            .footer a:hover {
            opacity: 1;
            }
            </style>
            </head>
            <body>

            <div class="card">
            <h1>🎯 Guess N Win</h1>
            <p>Guess the secret number. I’ll tell you if you’re too high, too low, or correct — play solo or with friends on Telegram.</p>
            <a class="btn" href="https://t.me/GuessNWinBot" target="_blank">@GuessNWinBot</a>
            </div>

            <div class="footer">
            Made with ❤️ by <a href="https://heymark.vercel.app" target="_blank">MARK</a>
            </div>

            </body>
            </html>
        `);
});

// Start the server
app.listen(port, () => {
    console.log(`Bot server running on port ${port}`);
});


// Set commands
bot.setMyCommands([
    { command: "start", description: "Start the game" },
    { command: "guess", description: "Make a guess (e.g. /guess 42)" },
    { command: "help", description: "How to play" },
    { command: "stats", description: "View your game stats" },
    { command: "leaderboard", description: "View top players" },
    { command: "gamesettings", description: "Set lives per game (max 10)" }
]);

// Inline options
const options = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🔄 Play Again", callback_data: "start_game" }],
            [{ text: "📊 View Stats", callback_data: "view_stats" }]
        ]
    }
};

// SQLite DB setup
const db = new sqlite3.Database("./db.sqlite");
db.run(`CREATE TABLE IF NOT EXISTS stats (
    user_id INTEGER PRIMARY KEY,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0
)`);

// Game state
let games = {}; // { chatId: { secretNumber, lives, attempts, playing } }
let leaderboard = []; // { userId, name, attempts }
let gameSettings = {
    lives: 6 // Store default lives and allow change up to 10
};

// Helper: get translation
function t(langCode, key) {
    return langData[langCode] && langData[langCode][key]
        ? langData[langCode][key]
        : langData["en"][key];
}

// Update stats in DB
function updateStats(userId, won = false) {
    db.run(
        `INSERT INTO stats (user_id, games_played, wins)
         VALUES (?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET
         games_played = games_played + 1,
         wins = wins + ?`,
        [userId, won ? 1 : 0, won ? 1 : 0]
    );
}

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const lang = msg.from.language_code || "en";

    bot.sendMessage(chatId, t(lang, "welcome"), {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🎮 Start Game", callback_data: "start_game" }],
                [{ text: "📜 How to Play", callback_data: "how_to_play" }]
            ]
        }
    });
});

// /stats
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    db.get(`SELECT games_played, wins FROM stats WHERE user_id = ?`, [msg.from.id], (err, row) => {
        if (row) {
            bot.sendMessage(chatId, `📊 Stats:\nGames Played: ${row.games_played}\nWins: ${row.wins}`);
        } else {
            bot.sendMessage(chatId, "No stats found. Start playing to see stats!");
        }
    });
});

// /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const lang = msg.from.language_code || "en";
    bot.sendMessage(chatId, t(lang, "how_to_play"));
});

// /leaderboard
bot.onText(/\/leaderboard/, (msg) => {
    if (leaderboard.length === 0) {
        return bot.sendMessage(msg.chat.id, "🏆 No scores yet! Play a game first.");
    }

    let text = "🏆 Leaderboard (Fewest Attempts)\n\n";
    leaderboard.slice(0, 10).forEach((player, index) => {
        text += `${index + 1}. ${player.name} — ${player.attempts} attempts\n`;
    });

    bot.sendMessage(msg.chat.id, text);
});

// /gamesettings
bot.onText(/\/gamesettings(?:\s+(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const livesArg = match[1]; // Captures the number after command

    if (!livesArg) {
        return bot.sendMessage(
            chatId,
            `Current lives setting: ${gameSettings.lives}\n\nUse: /gamesettings <lives> (max 10)`
        );
    }

    const newLives = parseInt(livesArg);
    if (isNaN(newLives) || newLives < 1 || newLives > 10) {
        return bot.sendMessage(chatId, 'Please enter a valid number between 1 and 10.');
    }

    gameSettings.lives = newLives;
    bot.sendMessage(chatId, `Lives per game updated to: ${gameSettings.lives}`);
});



// Inline button actions
bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const lang = callbackQuery.from.language_code || "en";

    if (callbackQuery.data === "start_game") {
        games[chatId] = {
            secretNumber: Math.floor(Math.random() * 100) + 1,
            lives: gameSettings.lives,
            attempts: 0,
            playing: true
        };
        bot.sendMessage(chatId, `${t(lang, "start_new")}\n❤️ Lives left: ${gameSettings.lives}`);
    }

    if (callbackQuery.data === "how_to_play") {
        bot.sendMessage(chatId, t(lang, "how_to_play"));
    }

    if (callbackQuery.data === "view_stats") {
        db.get(`SELECT games_played, wins FROM stats WHERE user_id = ?`, [callbackQuery.from.id], (err, row) => {
            if (row) {
                bot.sendMessage(chatId, `📊 Stats:\nGames Played: ${row.games_played}\nWins: ${row.wins}`);
            } else {
                bot.sendMessage(chatId, "No stats found. Start playing to see stats!");
            }
        });
    }

    bot.answerCallbackQuery(callbackQuery.id);
});

// /guess <number>
bot.onText(/\/guess (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const guess = parseInt(match[1], 10);
    const lang = msg.from.language_code || "en";

    const game = games[chatId];

    if (!game || !game.playing) {
        return bot.sendMessage(chatId, "❌ Please start a game first by pressing 'Start Game'.");
    }

    game.attempts++;
    game.lives--;

    if (guess === game.secretNumber) {
        bot.sendMessage(chatId, `${t(lang, "correct")} 🎯 You guessed in ${game.attempts} attempts.`, options);
        updateStats(msg.from.id, true);

        leaderboard.push({
            userId: msg.from.id,
            name: msg.from.first_name,
            attempts: game.attempts
        });

        leaderboard.sort((a, b) => a.attempts - b.attempts);

        game.playing = false;
    } else if (game.lives <= 0) {
        bot.sendMessage(chatId, `💀 Game Over! The correct number was ${game.secretNumber}.`, options);
        updateStats(msg.from.id, false);
        game.playing = false;
    } else {
        let hint = guess > game.secretNumber ? t(lang, "too_high") : t(lang, "too_low");
        bot.sendMessage(chatId, `${hint}\n❤️ Lives left: ${game.lives}`);
    }
});
