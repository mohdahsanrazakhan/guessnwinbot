// const TelegramBot = require("node-telegram-bot-api");
// const sqlite3 = require("sqlite3").verbose();
// const fs = require("fs");
// require('dotenv').config();

// // Load language file
// const langData = JSON.parse(fs.readFileSync("./lang.json", "utf8"));

// // Bot token from BotFather
// const token = process.env.YOUR_BOT_TOKEN;
// const bot = new TelegramBot(token, { polling: true });

// // Set commands in bot menu
// bot.setMyCommands([
//     { command: "start", description: "Start the game" },
//     { command: "newgame", description: "Start a new game" },
//     { command: "guess", description: "Make a guess (e.g. /guess 42)" },
//     { command: "help", description: "How to play" },
//     { command: "stats", description: "View your game stats" }
// ]);


// // SQLite DB setup
// const db = new sqlite3.Database("./db.sqlite");
// db.run(`CREATE TABLE IF NOT EXISTS stats (
//     user_id INTEGER PRIMARY KEY,
//     games_played INTEGER DEFAULT 0,
//     wins INTEGER DEFAULT 0
// )`);

// // Store active games in memory
// let games = {};

// // Helper: get user language string
// function t(langCode, key) {
//     return langData[langCode] && langData[langCode][key]
//         ? langData[langCode][key]
//         : langData["en"][key];
// }

// // Update stats in DB
// function updateStats(userId, won = false) {
//     db.run(
//         `INSERT INTO stats (user_id, games_played, wins)
//          VALUES (?, 1, ?)
//          ON CONFLICT(user_id) DO UPDATE SET
//          games_played = games_played + 1,
//          wins = wins + ?`,
//         [userId, won ? 1 : 0, won ? 1 : 0]
//     );
// }

// function startNewGame(chatId) {
//     games[chatId] = {
//         secretNumber: Math.floor(Math.random() * 100) + 1,
//         attempts: 0
//     };
//     bot.sendMessage(chatId, "🎯 A new game has started! Guess a number between 1 and 100.");
// }


// // Start Command
// bot.onText(/\/start/, (msg) => {
//     const chatId = msg.chat.id;
//     const lang = msg.from.language_code || "en";

//     bot.sendMessage(chatId, t(lang, "welcome"), {
//         reply_markup: {
//             inline_keyboard: [
//                 [{ text: "🎮 Start Game", callback_data: "start_game" }],
//                 [{ text: "📜 How to Play", callback_data: "how_to_play" }]
//             ]
//         }
//     });
// });


// // Guess Command
// bot.onText(/\/guess (\d+)/, (msg, match) => {
//     const chatId = msg.chat.id;
//     const guess = parseInt(match[1], 10);
//     const lang = msg.from.language_code || "en";

//     if (!games[chatId]) {
//         bot.sendMessage(chatId, t(lang, "start_new"));
//         games[chatId] = Math.floor(Math.random() * 100) + 1;
//         return;
//     }

//     if (guess === games[chatId]) {
//         bot.sendMessage(chatId, t(lang, "correct"), {
//             reply_markup: {
//                 inline_keyboard: [
//                     [{ text: "🔄 Play Again", callback_data: "start_game" }],
//                     [{ text: "📊 View Stats", callback_data: "view_stats" }]
//                 ]
//             }
//         });
//         updateStats(msg.from.id, true);
//         delete games[chatId];
//     } else if (guess > games[chatId]) {
//         bot.sendMessage(chatId, t(lang, "too_high"));
//     } else {
//         bot.sendMessage(chatId, t(lang, "too_low"));
//     }
// });

// // Stats Command
// bot.onText(/\/stats/, (msg) => {
//     const chatId = msg.chat.id;
//     db.get(`SELECT games_played, wins FROM stats WHERE user_id = ?`, [msg.from.id], (err, row) => {
//         if (row) {
//             bot.sendMessage(chatId, `📊 Stats:\nGames Played: ${row.games_played}\nWins: ${row.wins}`);
//         } else {
//             bot.sendMessage(chatId, "No stats found. Start playing to see stats!");
//         }
//     });
// });

// // Help Command
// bot.onText(/\/help/, (msg) => {
//     const chatId = msg.chat.id;
//     const lang = msg.from.language_code || "en";
//     bot.sendMessage(chatId, t(lang, "how_to_play"));
// });

// // Inline Button Handlers
// bot.on("callback_query", (callbackQuery) => {
//     const chatId = callbackQuery.message.chat.id;
//     const lang = callbackQuery.from.language_code || "en";

//     if (callbackQuery.data === "start_game") {
//         games[chatId] = Math.floor(Math.random() * 100) + 1;
//         bot.sendMessage(chatId, t(lang, "start_new"));
//     }

//     if (callbackQuery.data === "how_to_play") {
//         bot.sendMessage(chatId, t(lang, "how_to_play"));
//     }

//     if (callbackQuery.data === "view_stats") {
//         db.get(`SELECT games_played, wins FROM stats WHERE user_id = ?`, [callbackQuery.from.id], (err, row) => {
//             if (row) {
//                 bot.sendMessage(chatId, `📊 Stats:\nGames Played: ${row.games_played}\nWins: ${row.wins}`);
//             } else {
//                 bot.sendMessage(chatId, "No stats found. Start playing to see stats!");
//             }
//         });
//     }

//     bot.answerCallbackQuery(callbackQuery.id);
// });


const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
require('dotenv').config();

// Load language file
const langData = JSON.parse(fs.readFileSync("./lang.json", "utf8"));

// Bot token from BotFather
const token = process.env.YOUR_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Set commands in bot menu
bot.setMyCommands([
    { command: "start", description: "Start the game" },
    { command: "guess", description: "Make a guess (e.g. /guess 42)" },
    { command: "help", description: "How to play" },
    { command: "stats", description: "View your game stats" }
]);

// Option button
const options = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🔄 Play Again", callback_data: "start_new" }],
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

// Store active games in memory
let games = {};

// Helper: get user language string
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

// Start Command
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

// Stats Command
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

// Help Command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const lang = msg.from.language_code || "en";
    bot.sendMessage(chatId, t(lang, "how_to_play"));
});

// Inline Button Handlers
bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const lang = callbackQuery.from.language_code || "en";

    if (callbackQuery.data === "start_game") {
        games[chatId] = {
            secretNumber: Math.floor(Math.random() * 100) + 1,
            lives: 6
        };
        bot.sendMessage(chatId, `${t(lang, "start_new")}\n❤️ Lives left: 6`);
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

// Guess Command with lives system
bot.onText(/\/guess (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const guess = parseInt(match[1], 10);
    const lang = msg.from.language_code || "en";

    if (!games[chatId]) {
        bot.sendMessage(chatId, t(lang, "start_new"));
        games[chatId] = {
            secretNumber: Math.floor(Math.random() * 100) + 1,
            lives: 6
        };
        return;
    }

    const game = games[chatId];

    if (guess === game.secretNumber) {
        bot.sendMessage(chatId, t(lang, "correct"), options);
        updateStats(msg.from.id, true);
        delete games[chatId];
    } else {
        game.lives--;

        if (game.lives <= 0) {
            bot.sendMessage(chatId, `💀 Game Over! The correct number was ${game.secretNumber}.`, options);
            updateStats(msg.from.id, false);
            delete games[chatId];
        } else {
            let hint = guess > game.secretNumber ? t(lang, "too_high") : t(lang, "too_low");
            bot.sendMessage(chatId, `${hint}\n❤️ Lives left: ${game.lives}`);
        }
    }
});
