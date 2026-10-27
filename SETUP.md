# Switch on Meuro Market Run live features (Supabase)

Until these steps are done, the website and the solo game work for everyone.
Accounts, races with friends, crews, the leaderboard and streak saving switch on
as soon as `meuro-config.js` has your Supabase details.

Everything below fits Supabase's free plan. No bank card needed to start.

## 1. Create the Supabase project (3 min)
1. Go to **supabase.com**, tap **Start your project**, and sign in with GitHub.
2. Tap **New project**. Name it `meuro`, set a strong database password (save it somewhere safe),
   and choose the region **West EU (Ireland)**. Tap **Create new project** and wait about a minute.

## 2. Create the tables and security rules (2 min)
1. In the left menu open **SQL Editor**, then **New query**.
2. Open `supabase/schema.sql` from this repository, copy **all** of it, paste it in, and tap **Run**.
   You should see "Success". It is safe to run again later.

## 3. Login settings (3 min)
1. **Authentication > Sign In / Providers > Email**: keep Email on, keep **Confirm email** on,
   and set **Minimum password length** to 8. Save.
2. **Authentication > URL Configuration**:
   - **Site URL**: `https://meuroapp.com/`
   - **Redirect URLs**: add `https://meuroapp.com/**` and `https://www.meuroapp.com/**`
     (and `https://treshposh.github.io/meurowebsite2/**` if you still open the GitHub link).
3. If **Realtime > Settings** shows **Allow public access**, switch it **off**. Only signed-in
   players can then join live markets and races (the rules from step 2 allow exactly that).

## 4. Email delivery (needed before real users sign up, 10 min)
Supabase's built-in email only reaches your own team and sends about 2 emails an hour, so
confirmation emails would not reach your players. Connect a free email service:
1. Create a free account at **brevo.com** (300 emails a day on the free plan).
2. In Brevo, open **SMTP & API** and copy the SMTP login and key.
3. In Supabase open **Authentication > Emails > SMTP Settings**, switch on **Custom SMTP**, and enter:
   host `smtp-relay.brevo.com`, port `587`, your Brevo login and SMTP key, and a sender such as
   `Meuro <hello@your-domain>`.
4. In **Authentication > Rate Limits**, raise "emails per hour" to suit (for example 100).
Guide: https://developers.brevo.com/docs/supabase-smtp-integration

## 5. Connect the website (2 min)
1. In Supabase open **Project Settings > API** (or the **Connect** button).
2. Copy the **Project URL** and the **anon / publishable** key.
3. In GitHub, open `meuro-config.js`, tap the pencil icon, paste them in, and **Commit changes**.
   Never paste the `service_role` / secret key anywhere in the website.

## 6. Make yourself the owner (1 min)
1. Open your site, tap **Log in > Create account**, sign up with your own email and confirm it.
2. Back in Supabase **SQL Editor**, run (with your email):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
   ```
3. Log in again. The leaderboard now shows your private **Sign-ups** list (with CSV export) and
   **Price reports to check**.

## Optional
- **Google Analytics**: create a free GA4 property at analytics.google.com and paste the
  measurement ID (starts with `G-`) into `GA_MEASUREMENT_ID` in `meuro-config.js`.
- **Robot check on sign-up**: create a free Cloudflare Turnstile widget for your site address,
  put the site key in `TURNSTILE_SITE_KEY`, and the secret key in Supabase
  **Authentication > Attack Protection > Enable CAPTCHA protection** (provider: Turnstile).

## Growing to 100,000 players
- Free plan limits that matter first: 50,000 monthly active users, 500 MB database, and caps on live
  connections and messages. The game splits busy markets into rooms of 40 riders and only sends
  positions a few times a second to stay efficient, but at tens of thousands of daily players you
  will need the **Pro plan**.
- Free projects pause after a week with no activity. Regular players prevent this; if the site
  goes quiet, open the Supabase dashboard and tap **Restore**.
- Brevo's free plan sends 300 emails a day; move to a paid email plan when daily sign-ups grow past that.

## Undo Version 8
The previous live site is saved on the `v7-backup` branch. To go back, ask Claude to
"restore v7-backup to main", or in GitHub open a pull request from `v7-backup` into `main`.
