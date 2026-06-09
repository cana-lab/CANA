// electron-builder afterSign hook — notarizes the signed .app with Apple's
// Notary service (notarytool). Runs automatically during `npm run pack:mac`.
//
// Credentials come from environment variables, which the "Build signed Mac
// app.command" launcher loads from the macOS Keychain (so they're never stored
// in the repo). If they're absent, notarization is skipped with a clear notice
// rather than failing the build (useful for local unsigned test builds).
//
//   APPLE_ID                    your Apple Developer account email
//   APPLE_APP_SPECIFIC_PASSWORD an app-specific password (NOT your main password)
//   APPLE_TEAM_ID               your 10-character Team ID
//
// See SIGNING_AND_NOTARIZING.md for the one-time setup.

const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log(
      "\n  ⚠️  Skipping notarization — Apple credentials not set.\n" +
      "     The .dmg will build but will NOT open cleanly on other Macs.\n" +
      "     Run \"Build signed Mac app.command\" to notarize. See\n" +
      "     SIGNING_AND_NOTARIZING.md for the one-time setup.\n"
    );
    return;
  }

  console.log(`\n  → Notarizing ${appName}.app with Apple (this can take 2–15 minutes)…`);
  await notarize({
    tool: "notarytool",
    appBundleId: context.packager.appInfo.id,
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });
  console.log("  ✓ Notarization complete — the app will open with a double-click.\n");
};
