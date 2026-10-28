# Meuro website

Multi-page website for Meuro (African food, nutrition and wellness), opening with
**Meuro Market Run**: a 3D market game with 50 dishes from 13 African countries,
real Lagos prices, Market of the Day, streaks, badges, races with friends, crews,
shouts and a leaderboard. live

| File | What it is |
|---|---|
| `index.html` | Market Run game page |
| `game.js` | Game logic (3D market, rides, live play) |
| `market-data.js` | Countries, ingredients, dishes, prices and sources |
| `backend.js` | Supabase connection: accounts, data, live rooms |
| `boot.js` | Tiny start-up script the game waits on |
| `analytics.js` | Google Analytics with a consent notice |
| `meuro-config.js` | Your Supabase URL and public key, analytics and captcha settings |
| `supabase/schema.sql` | Database tables, security rules and functions to paste into Supabase |
| `home.html`, `ai.html`, `foods.html`, `kitchen.html`, `nutritionists.html`, `about.html`, `faq.html` | Website pages |
| `SETUP.md` | Step-by-step guide to switch on the live features |

Security: every page sends a strict Content Security Policy; all database tables use row level
security; players can only change data through checked, rate-limited database functions; emails
are visible only to the player and to admins.

Previous version (Firebase, before Version 8): branch `v7-backup`.
