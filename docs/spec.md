# Browser Tool Contract

The host registers one tool through `defineTool` and persists screenshot bytes through the official attachment service. Context ownership is the Harness session ID. Operations serialize within a session and preserve isolation between sessions. Input consumes an observation counter and exact accessibility locator. Inspections are fixed functions returning redacted structured values. Abort closes the owning context. Disposal closes all contexts and Chromium. No host source patch is required.
