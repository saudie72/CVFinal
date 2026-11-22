# Feedback (Apple HIG)

**Source:** Apple Human Interface Guidelines, Feedback: https://developer.apple.com/design/human-interface-guidelines/feedback

Feedback helps people know what's happening, discover what they can do next, understand the results of their actions, and avoid mistakes. **Match the importance of the information to how it's delivered:** passive for status, interrupting only for things like possible data loss.

## Best practices (HIG)
- **Make all feedback accessible.** Combine colour, text, sound and haptics, so people get it even if they look away or use VoiceOver.
- **Put status feedback in the interface**, near what it describes (e.g., Mail's toolbar shows the last update and the unread count).
- **Use alerts only for critical, ideally actionable information.** Alerts lose their impact when overused.
- **Warn before unexpected, irreversible data loss**, but don't warn when data loss is the *expected* result of the action.
- **Confirm significant completed actions** only when they matter. People expect success and need to hear mainly about failure.
- **When a command can't be carried out, show it and explain why.**

## Applied to the inspector
| Situation | Feedback |
|---|---|
| OpenCV loading / working | Inline status pill + `aria-live` text, no alert |
| Comparison done | The result card itself (PASS/FAIL with icon + words); no toast |
| Reset app data / delete page | Confirmation dialog, because the loss is irreversible and not obvious |
| Delete a single run | No dialog (expected); offer **Undo** for 5 s |
| Can't compare (missing baseline, wrong file type, images too different) | Inline message that says why and what to do: "Add a baseline for this page first" |
| Worker timed out | "Comparison took too long and was restarted. Try again, or reduce the screenshot size." |
