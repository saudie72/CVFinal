# Progress indicators and loading (Apple HIG)

**Sources:** Apple HIG, Progress indicators: https://developer.apple.com/design/human-interface-guidelines/progress-indicators · Loading: https://developer.apple.com/design/human-interface-guidelines/loading

## HIG best practices
- **Prefer a determinate indicator** when you can. It helps people decide whether to wait.
- **Report progress accurately and evenly.** Showing 90% in 5 s and the last 10% in 5 minutes feels deceptive.
- **Keep indicators moving.** A stopped indicator looks like a frozen app. If something stalls, explain the problem and what to do.
- **Switch from indeterminate to determinate** once the duration becomes known.
- **Don't switch between the spinner and the bar styles**, because the change in shape is disruptive.
- **Add a short, specific description if it helps.** Avoid vague words like "loading".
- **Show progress in a consistent location.**
- **Let people cancel** when that's safe, and warn if cancelling loses work.

## Applied to the inspector
- **One location:** the status pill in the top bar, always.
- **Specific text, not "Loading…":** `Loading OpenCV (10 MB, first visit only)…` → `Ready` → `Comparing: Aligning (1/4)` → `Finding differences (2/4)` → `Measuring regions (3/4)` → `Saving (4/4)`.
- **Determinate steps:** the worker sends `progress {step, index, total}`, so the pill shows a thin determinate bar under the text.
- **Cancel:** a "Cancel" button while comparing (calls `worker.terminate()` and respawns). It's safe because nothing has been saved yet.
- **Stall:** the 30 s watchdog leads to an explanation and a "Try again" button (it never spins forever).
