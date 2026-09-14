# Browser Verification Scenarios

1. Install in a clean Harness Web profile and create a session with the `browser` tool.
2. Navigate a local form, snapshot, fill an observed textbox, click its submit button, and verify the rendered result.
3. Reject an older observation counter and refresh the snapshot before continuing.
4. Capture console output and a nonblank screenshot; verify the image appears as a Harness attachment.
5. Open another Harness session and verify URL, cookies and storage are isolated. Close and recreate a context.
6. Reject file/data URLs, arbitrary evaluation and password filling. Verify read-only policy denies input.
7. Close Harness and confirm its managed browser exits. Restart and verify fresh login state.
8. Open a session, expand the right Sidebar, open the Browser guide entry, and verify the pane streams the Host Chromium page with no page title in the chrome.
9. Enter a local HTTP fixture address, press Enter or the go button, click its input on the frame, type text and click its button. Verify the updated result is visible, then exercise Back, Forward, Reload and Close browser.
10. Reject non-HTTP(S) addresses in the page and keep the error visible across frame updates until the next operation. A site with frame restrictions should render normally through the Host browser.
11. Configure a missing browser executable in a disposable profile and verify `BROWSER_RUNTIME_MISSING` is returned. Configure an installed Chrome or install the matching Playwright Chromium revision, restart Harness, and verify navigation succeeds.
12. Resize the Sidebar and verify the page reflows to its available width and height and the viewport follows. Repeat input and button clicks after resizing.
13. Click the frame input, type a sentence, paste Chinese text, use Select All, Backspace, Tab and Enter, and verify the result in the page. Scroll over the frame and verify the inner page moves while the surrounding Harness layout remains fixed.
14. Verify the operation cues: hovering outlines the element under the pointer and captions its role and name; clicking draws a ripple at the point and a labelled pointer; a focused input shows an outline and a blinking caret; typed text echoes briefly; dragging draws a guide line and selects text.
15. While the Agent drives the same page, verify its click, fill, key, scroll and drag actions appear in the pane with an arrow, a caption and the affected element outline; verify a still page stops producing frames.
16. Block the stream route in a disposable profile and verify the pane falls back to one-shot captures, marks the toolbar `兼容模式`, and returns to live frames once the route answers again.

The automated Playwright fixture covers the browser engine and the stream contract. Harness Web loading, right Sidebar activation, and the native attachment path are separate integration checks.
