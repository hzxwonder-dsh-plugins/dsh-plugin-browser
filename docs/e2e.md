# Browser Verification Scenarios

1. Install in a clean Harness Web profile and create a session with the `browser` tool.
2. Navigate a local form, snapshot, fill an observed textbox, click its submit button, and verify the rendered result.
3. Reject an older observation counter and refresh the snapshot before continuing.
4. Capture console output and a nonblank screenshot; verify the image appears as a Harness attachment.
5. Open another Harness session and verify URL, cookies and storage are isolated. Close and recreate a context.
6. Reject file/data URLs, arbitrary evaluation and password filling. Verify read-only policy denies input.
7. Close Harness and confirm its managed browser exits. Restart and verify fresh login state.
8. Open a session, expand the right Sidebar, open the Browser guide entry, and verify the local Harness page renders inside the iframe.
9. Enter a local HTTP fixture address, press Enter or `Go`, verify the frame changes, and use `Reload` to create a fresh frame.
10. Reject non-HTTP(S) addresses in the page and verify a frame-denying site is reported as an embedding limitation rather than treated as a successful navigation.

The automated Playwright fixture covers the browser engine. Harness Web loading, right Sidebar activation, and the native attachment path are separate integration checks.
