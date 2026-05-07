// Stormgauge operator configuration — example.
//
// Copy this file to `stormgauge-config.js` (kept out of git) and load it
// via a <script src="stormgauge-config.js"></script> tag placed BEFORE
// the main inline <script> in index.html. Keys not set here fall back
// to neutral defaults baked into Stormgauge.
//
// All keys are optional.

window.STORMGAUGE_CONFIG = {
  // ── Backend ───────────────────────────────────────────────────────
  // Override the rainfall API base URL. Defaults to the Pluviometrics
  // production endpoint.
  // apiBaseUrl: 'https://your-rainfall-api.example.com',

  // ── Future Works tab ──────────────────────────────────────────────
  // Council program-of-works backlog — local-folder template and
  // workbook filename shown to operators in the Future Works tab. The
  // public deploy ships neutral placeholders; operator deploys can
  // replace these with their own SharePoint / OneDrive structure.
  // Backslashes must be doubled in JS strings.
  // futureWorksFolderTemplate: '%USERPROFILE%\\OneDrive - Your Council\\Stormwater Engineering\\Program',
  // futureWorksWorkbookName: 'Program of works backlog.xlsx',

  // ── Critical Assets tab ───────────────────────────────────────────
  // Default file paths for the local Critical Assets data inputs.
  // Empty string = leave the user's input box empty.
  // criticalSourcePath: 'D:\\YourFolder\\assets_with_coords.csv',
  // criticalCombinedPath: 'D:\\YourFolder\\combined_assets.csv',
  // criticalInspectionPath: 'D:\\YourFolder\\critical_asset_inspections.xlsx',
};
