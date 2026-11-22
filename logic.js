/**
 * Returns the inclusive range from the first message to `targetId`.
 * The target is clamped to the chat bounds. Returns null when the chat is empty
 * or the target is not a usable number.
 * @param {number} targetId
 * @param {number} chatLength
 * @returns {{start: number, end: number} | null}
 */
export function getRangeFromFirst(targetId, chatLength) {
    if (!Number.isInteger(chatLength) || chatLength < 1) {
        return null;
    }
    if (targetId === null || targetId === undefined || targetId === '') {
        return null;
    }
    const numericTarget = Number(targetId);
    if (!Number.isFinite(numericTarget)) {
        return null;
    }
    const end = Math.min(Math.max(Math.trunc(numericTarget), 0), chatLength - 1);
    return { start: 0, end };
}

/**
 * Counts messages in [start, end] whose hidden state differs from `hidden`.
 * `is_system` is SillyTavern's "excluded from prompts" flag.
 * @param {Array<object>} chat
 * @param {number} start
 * @param {number} end
 * @param {boolean} hidden Desired hidden state.
 * @returns {number}
 */
export function countStateChanges(chat, start, end, hidden) {
    if (!Array.isArray(chat)) {
        return 0;
    }
    const from = Math.max(0, Math.trunc(start));
    const to = Math.min(chat.length - 1, Math.trunc(end));
    let count = 0;
    for (let index = from; index <= to; index++) {
        if (Boolean(chat[index] && chat[index].is_system) !== hidden) {
            count++;
        }
    }
    return count;
}
