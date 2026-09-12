# Browser Verification Scenarios

1. Install in a clean Harness Web profile and create a session with the `browser` tool.
2. Navigate a local form, snapshot, fill an observed textbox, click its submit button, and verify the rendered result.
3. Reject an older observation counter and refresh the snapshot before continuing.
4. Capture console output and a nonblank screenshot; verify the image appears as a Harness attachment.
5. Open another Harness session and verify URL, cookies and storage are isolated. Close and recreate a context.
6. Reject file/data URLs, arbitrary evaluation and password filling. Verify read-only policy denies input.
7. Close Harness and confirm its managed browser exits. Restart and verify fresh login state.

The automated Playwright fixture covers the browser engine. Harness Web loading and the native attachment path are separate integration checks.
