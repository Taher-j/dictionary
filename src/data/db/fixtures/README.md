# Schema fixtures

`schema-<n>.db` is a database at schema version `n` (migrations applied), holding the same sample
data: dictionary "German", words "Haus" (meaning "house", starred, tag "nouns") and "leer", setting
`dailyNewLimit` = 12. `migrationFixtures.test.ts` migrates a copy of each to the latest schema and
reads the sample back (docs/06-data-safety.md, "Migrations").

Add a fixture for every released schema version before adding the next migration. Never edit an
existing one.
