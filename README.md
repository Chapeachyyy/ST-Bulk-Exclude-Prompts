# Bulk Exclude from Prompts — SillyTavern Extension

Adds a bulk version of SillyTavern's **Exclude message from prompts** eye button.

There are two ways to use it:

1. **Wand menu selection mode** — pick **Exclude messages up to…** from the
   Extensions wand menu. The chat switches into a selection mode (like the
   built-in *Delete messages* mode), then click any message. Every message from
   the first message up to the clicked one is selected automatically. Press
   **Exclude** to confirm, or **Cancel** / `Esc` to leave.
2. **Per-message button** — open a message's **⋮ Message Actions** menu and click
   the ban icon to exclude everything from the first message up to that one in
   a single step.

The messages stay in the chat and remain visible on screen — they are simply
invisible to the AI.

## Installation

1. Copy the `ST-Bulk-Exclude-Prompts` folder into
   `data/<your-user>/extensions/`.
2. Reload SillyTavern.

The extension appears under **Extensions → Bulk Exclude from Prompts**.

## Usage

### Selection mode (wand menu)

1. Open the wand menu (🪄) and choose **Exclude messages up to…**.
2. Click the message you want to stop at.
   The extension ticks every message from `#1` through that message.
3. Press **Exclude** to apply, or **Cancel** / `Esc` to abort.
4. The selection bar shows the exact range and message count before you confirm.

### One-click button (message menu)

1. Open the **⋮ Message Actions** menu on the target message.
2. Click the **ban** icon.
3. Confirm the range in the popup.

## Undo

- Per message: open **⋮** and click the **eye** icon (`Include message in prompts`)
  to bring that message back into prompts.
- Range: use SillyTavern's `/unhide 0-N` command. Note that it also unhides
  system/narrator messages that were already hidden.

## Notes

- Uses SillyTavern's native `hideChatMessageRange()`, so chat persistence,
  message IDs and swipe controls stay consistent.
- Messages are only excluded from prompts. Nothing is deleted.
- System/narrator messages are already excluded; they simply stay excluded.
- Actions are blocked while a reply is being generated.
- Works in single and group chats.
- The message-menu confirmation popup can be turned off in
  **Extensions settings → Bulk Exclude from Prompts**.

## Development

- `npm test` runs the `node:test` unit tests for `logic.js`.
- No build step: `index.js` is loaded directly by SillyTavern as an ES module.

## License

MIT
