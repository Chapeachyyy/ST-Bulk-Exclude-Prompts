# Bulk Exclude from Prompts — SillyTavern Extension

Adds a bulk version of SillyTavern's **Exclude message from prompts** eye button.

Clicking the new ban button in a message's **Message Actions** (three dots) menu
excludes **every message from the first message up to that one** from the AI
prompt, in one go. The messages stay in the chat and remain visible on screen —
they are simply invisible to the AI.

This is handy for long translation or roleplay chats where the greeting and the
first few exchanges are no longer needed but you do not want to delete them.

## Installation

1. Copy the `ST-Bulk-Exclude-Prompts` folder into
   `data/<your-user>/extensions/`.
2. Reload SillyTavern.

The extension appears under **Extensions → Bulk Exclude from Prompts**.

## Usage

1. Open the **⋮ Message Actions** menu on the message you want to stop at.
2. Click the **ban** icon (Exclude from prompts: first message → here).
3. Confirm the range in the popup.

Every message from `#1` through the selected message is marked as excluded from
prompts, exactly like clicking the single-message eye on each one.

## Notes

- Uses SillyTavern's native `hideChatMessageRange()`, so chat persistence,
  message IDs and swipe controls stay consistent.
- Messages are only excluded from prompts. Nothing is deleted.
- System/narrator messages are already excluded; they simply stay excluded.
- The action is blocked while a reply is being generated.
- Works in single and group chats.
- Confirmation can be turned off in **Extensions settings → Bulk Exclude from Prompts**.

## Development

- `npm test` runs the `node:test` unit tests for `logic.js`.
- No build step: `index.js` is loaded directly by SillyTavern as an ES module.

## License

MIT
