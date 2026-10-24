# Switch on Meuro Market Run live features

Everything runs on Firebase's free Spark plan. You do not need a bank card.
Until you finish these steps, the site and solo game still work, and the live
features stay hidden.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Tap **Create a project**, name it `meuro`, and finish the steps. You can turn Google Analytics off.

## 2. Turn on email login
1. In the left menu, open **Build → Authentication → Get started**.
2. Under **Sign-in method**, choose **Email/Password**, switch it **on**, and save.

## 3. Create the database
1. Open **Build → Realtime Database → Create database**.
2. Pick the location closest to your players (for Nigeria, **Belgium (europe-west1)**).
3. Choose **Start in locked mode**.
4. Open the **Rules** tab, delete what is there, and paste in everything from `database.rules.json`.
5. In the pasted rules, change `you@example.com` to **your own email**. Tap **Publish**.

## 4. Connect the website to Firebase
1. Open **Project settings** (gear icon) → **Your apps** → tap the **web icon `</>`**.
2. Name it `meuro-web`, then **Register app**.
3. Firebase shows a `firebaseConfig` block. Copy each value into `firebase-config.js`.
   Make sure `databaseURL` is filled in. If it is missing, copy it from the top of the Realtime Database page.
4. In the same file, change `ADMIN_EMAILS` to your own email.

## 5. Put the site online
Pick one:
- **GitHub Pages:** upload all the files in this folder to a GitHub repository, then in the repository open
  **Settings → Pages**, set the source to the `main` branch and the `/ (root)` folder, and save.
  Your site appears at `https://<your-username>.github.io/<repository>/`.
- **Firebase Hosting** (needs a computer): install Node.js, run `npm install -g firebase-tools`,
  `firebase login`, `firebase use --add` (choose your project), then `firebase deploy` in this folder.

## 6. Allow your site address to log in
1. In Firebase, open **Authentication → Settings → Authorized domains**.
2. Tap **Add domain** and add your site's address (for example `your-username.github.io`).

## 7. Claim the owner account
1. Open your live site, tap **Log in → Create account**, and sign up with the email you put in the rules.
2. Open the verification email Firebase sends you and tap the link.
3. Log out and log in again. Open the **Leaderboard**: the private **Sign-ups** list now appears under the players.

## Good to know
- Race links look like `https://your-site/index.html?race=jollof-482`. Anyone who opens one is asked to log in,
  then lands straight in that race.
- The free plan allows 100 people connected at the same time and plenty of data for a launch.
  Firebase emails you before you get near a limit.
- To remove someone's details, delete their entry under `signups` in the Realtime Database page.
