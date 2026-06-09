# CANA — Signing & Notarizing the Mac app (one-time setup)

Goal: a `.dmg` people can download from your GitHub Release and open with a
**normal double-click** — no "app is damaged", no Terminal on their side.

You're now in the Apple Developer Program, so you have everything you need.
You do this setup **once**; after that, every release is one double-click.

---

## Step 1 — Create a "Developer ID Application" certificate (once)

This is the certificate that signs apps for distribution **outside** the App
Store (i.e. your GitHub download).

1. Open **Xcode ▸ Settings… ▸ Accounts**.
2. Select your Apple ID, pick your **Team**, click **Manage Certificates…**.
3. Click the **+** (bottom-left) ▸ **Developer ID Application**.
4. It appears in the list and is installed into your **login Keychain**.
   (You can verify in the Keychain Access app — look for
   "Developer ID Application: <your name> (TEAMID)".)

> If "+" doesn't offer "Developer ID Application", make sure your membership is
> active (it can take a few minutes after enrolling) and that you're the
> Account Holder/Admin.

## Step 2 — Make an app-specific password (once)

Apple's Notary service needs this (your normal Apple password won't work).

1. Go to **https://account.apple.com** ▸ **Sign-In & Security** ▸
   **App-Specific Passwords**.
2. Click **+**, name it e.g. `CANA notarize`, copy the generated password
   (looks like `abcd-efgh-ijkl-mnop`).

## Step 3 — Find your Team ID (once)

**https://developer.apple.com/account** ▸ **Membership details** ▸ copy the
**Team ID** (10 characters, e.g. `A1B2C3D4E5`).

---

## Step 4 — Build it (every release)

Double-click **"Build signed Mac app.command"** in the project folder.

- **First run only:** it asks for your Apple ID, Team ID, and the app-specific
  password, and stores them in your macOS **Keychain** (never in the project,
  never on GitHub). Input for the password is hidden.
- It then builds, **signs**, **notarizes** (submits to Apple — takes ~2–15
  minutes), and **staples** the result.
- When it finishes, the `release/` folder opens with your `CANA-x.y.z.dmg`.

That `.dmg` is the file you upload to your GitHub Release. Done.

> Every later release: just double-click the same launcher. No retyping.

---

## Step 5 — Publish on GitHub (every release)

1. On GitHub, go to your repo ▸ **Releases** ▸ **Draft a new release**.
2. Tag it (e.g. `v4.43.0`), give it a title and short notes.
3. **Drag the `.dmg`** from `release/` into the "Attach binaries" area.
4. **Publish release.**

Your in-app update checker already points at `cana-lab/CANA` releases, so users
on older versions will be told an update exists and can download the new `.dmg`.

---

## What your users experience

1. Download the `.dmg` from your GitHub Release.
2. Double-click it, drag **CANA** to **Applications**.
3. Open CANA from Applications — **it just opens.** No warning, no Terminal.

(Because it's signed with your Developer ID and notarized by Apple, Gatekeeper
trusts it. This is the only way to avoid the manual Terminal step on macOS 26.)

---

## Troubleshooting

- **"No Developer ID Application certificate found"** → redo Step 1; make sure
  it's in the **login** keychain.
- **Notarization fails / hangs** → check the Apple ID, Team ID, and that you
  used the **app-specific** password (not your main one). To re-enter them,
  delete the Keychain item: open **Keychain Access**, search
  `cana-notarize`, delete the entries, and run the launcher again.
- **Notarization is slow** → normal during big macOS releases; the launcher
  waits automatically. 2–15 min is typical.
- **App still won't open on another Mac** → confirm the build actually
  notarized (the launcher prints "Notarization complete"). If it printed
  "Skipping notarization", the credentials weren't found — see above.
