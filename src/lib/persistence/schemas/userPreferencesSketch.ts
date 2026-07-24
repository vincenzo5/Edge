/**
 * Phase 0 sketch aliases — production schema lives in userPreferences.ts.
 */
export {
  journalTradesTablePrefsSchema as journalTradesTablePrefsSketchSchema,
  parseUserPreferencesSnapshot as parseUserPreferencesSnapshotSketch,
  USER_PREFERENCES_LOCAL_SOURCE_KEYS,
  userPreferencesSnapshotSchema as userPreferencesSnapshotSketchSchema,
  type UserPreferencesSnapshot as UserPreferencesSnapshotSketch,
} from "@/lib/persistence/schemas/userPreferences";
