import { extension_settings, getContext, renderExtensionTemplateAsync } from '../../../extensions.js';
import { hideChatMessageRange } from '../../../chats.js';
import { isGenerating } from '../../../../script.js';
import { countStateChanges, getRangeFromFirst } from './logic.js?v=1.1.0';

const EXTENSION_NAME = 'ST-Bulk-Exclude-Prompts';
const SETTINGS_KEY = 'bulkExcludePrompts';
const LOG_PREFIX = '[Bulk Exclude from Prompts]';
const BUTTON_CLASS = 'mes_bulk_exclude_up';
const VERSION = '1.1.0';

const defaultSettings = {
    confirmBeforeChange: true,
};

let observer = null;
let modeActive = false;
let selectedEnd = null;
let sendFormDisplay = null;

function getSettings() {
    if (!extension_settings[SETTINGS_KEY]) {
        extension_settings[SETTINGS_KEY] = {};
    }
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (extension_settings[SETTINGS_KEY][key] === undefined) {
            extension_settings[SETTINGS_KEY][key] = value;
        }
    }
    return extension_settings[SETTINGS_KEY];
}

function getMessageId(messageElement) {
    const id = Number(messageElement?.getAttribute?.('mesid'));
    return Number.isInteger(id) ? id : null;
}

/* ------------------------------------------------------------------ */
/* Per-message button                                                  */
/* ------------------------------------------------------------------ */

function createButton() {
    const button = document.createElement('div');
    button.className = `mes_button ${BUTTON_CLASS} fa-solid fa-ban interactable`;
    button.title = 'Exclude from prompts: first message → here';
    button.setAttribute('tabindex', '0');
    button.addEventListener('click', event => {
        event.stopPropagation();
        const messageElement = button.closest('.mes');
        if (messageElement) {
            void excludeRangeUpTo(messageElement);
        }
    });
    return button;
}

function injectButton(messageElement) {
    if (!(messageElement instanceof HTMLElement)) {
        return;
    }
    const container = messageElement.querySelector('.extraMesButtons');
    if (!container || container.querySelector(`.${BUTTON_CLASS}`)) {
        return;
    }
    container.append(createButton());
}

function injectAllButtons() {
    document.querySelectorAll('#chat .mes[mesid]').forEach(injectButton);
}

function observeChat() {
    const chat = document.getElementById('chat');
    if (!chat || observer) {
        return;
    }
    observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) {
                    continue;
                }
                if (node.matches('#chat .mes[mesid]')) {
                    injectButton(node);
                } else {
                    node.querySelectorAll('#chat .mes[mesid]').forEach(injectButton);
                }
            }
        }
    });
    observer.observe(chat, { childList: true, subtree: true });
}

/* ------------------------------------------------------------------ */
/* Confirmation + direct action                                        */
/* ------------------------------------------------------------------ */

async function confirmExclusion(range, willChange) {
    const { callGenericPopup, POPUP_TYPE } = getContext();
    const total = range.end - range.start + 1;
    const label = total === 1 ? 'message' : 'messages';
    const content = $('<div>')
        .append($('<div>').text(`Exclude messages #${range.start + 1}–#${range.end + 1} from prompts?`))
        .append($('<div>')
            .addClass('bulk-exclude-prompts-hint')
            .text(`${willChange} of ${total} ${label} will change. Excluded messages stay in the chat but are invisible to the AI.`));
    const result = await callGenericPopup(content, POPUP_TYPE.CONFIRM, '', {
        okButton: 'Exclude',
        cancelButton: 'Cancel',
    });
    return Boolean(result);
}

async function excludeRangeUpTo(messageElement) {
    try {
        const context = getContext();
        const chat = context.chat;
        const id = getMessageId(messageElement);

        if (id === null) {
            return;
        }

        if (isGenerating()) {
            toastr.warning('Wait for the current generation to finish.', 'Bulk Exclude from Prompts');
            return;
        }

        const range = getRangeFromFirst(id, chat.length);
        if (!range) {
            toastr.warning('Could not determine the message range.', 'Bulk Exclude from Prompts');
            return;
        }

        const willChange = countStateChanges(chat, range.start, range.end, true);
        if (willChange === 0) {
            toastr.info('Every message in this range is already excluded from prompts.', 'Bulk Exclude from Prompts');
            return;
        }

        if (getSettings().confirmBeforeChange && !(await confirmExclusion(range, willChange))) {
            return;
        }

        await hideChatMessageRange(range.start, range.end, false);
        toastr.success(`Excluded messages #${range.start + 1}–#${range.end + 1} from prompts.`, 'Bulk Exclude from Prompts');
    } catch (error) {
        console.error(LOG_PREFIX, 'Failed to exclude messages from prompts', error);
        toastr.error('Could not exclude the messages. See the console for details.', 'Bulk Exclude from Prompts');
    }
}

/* ------------------------------------------------------------------ */
/* Wand menu selection mode                                            */
/* ------------------------------------------------------------------ */

function addWandMenuItem() {
    const container = document.getElementById('extensionsMenu');
    if (!container || document.getElementById('bulk_exclude_container')) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'bulk_exclude_container';
    wrapper.className = 'extension_container';
    wrapper.innerHTML = `
        <div id="bulk_exclude_menu_item" class="list-group-item flex-container flexGap5 interactable" title="Pick a message to exclude every message from the first one up to it from prompts" tabindex="0">
            <div class="fa-solid fa-ban extensionsMenuExtensionButton"></div>
            <span>Exclude messages up to…</span>
        </div>
    `;
    container.append(wrapper);
    document.getElementById('bulk_exclude_menu_item').addEventListener('click', toggleMode);
}

function ensureBar() {
    let bar = document.getElementById('bulk_exclude_bar');
    if (bar) {
        return bar;
    }

    bar = document.createElement('div');
    bar.id = 'bulk_exclude_bar';
    bar.innerHTML = `
        <span id="bulk_exclude_bar_label">Click a message to exclude from the first one up to it.</span>
        <div id="bulk_exclude_ok" class="menu_button disabled">Exclude</div>
        <div id="bulk_exclude_cancel" class="menu_button">Cancel</div>
    `;

    const sendForm = document.getElementById('send_form');
    const parent = sendForm?.parentElement;
    if (sendForm && parent) {
        parent.insertBefore(bar, sendForm);
    } else {
        document.body.append(bar);
    }

    document.getElementById('bulk_exclude_ok').addEventListener('click', applySelection);
    document.getElementById('bulk_exclude_cancel').addEventListener('click', exitMode);
    return bar;
}

function updateBar() {
    const ok = document.getElementById('bulk_exclude_ok');
    const label = document.getElementById('bulk_exclude_bar_label');
    if (!ok || !label) {
        return;
    }

    if (selectedEnd === null) {
        label.textContent = 'Click a message to exclude from the first one up to it.';
        ok.classList.add('disabled');
        return;
    }

    const chat = getContext().chat;
    const range = getRangeFromFirst(selectedEnd, chat.length);
    if (!range) {
        label.textContent = 'Click a message to exclude from the first one up to it.';
        ok.classList.add('disabled');
        return;
    }

    const total = range.end - range.start + 1;
    const messageLabel = total === 1 ? 'message' : 'messages';
    label.textContent = `Messages #${range.start + 1}–#${range.end + 1} (${total} ${messageLabel}) will be excluded from prompts.`;
    ok.classList.remove('disabled');
}

function selectUpTo(messageElement) {
    const id = getMessageId(messageElement);
    if (id === null) {
        return;
    }
    selectedEnd = id;

    document.querySelectorAll('#chat .mes[mesid]').forEach(element => {
        const messageId = Number(element.getAttribute('mesid'));
        const selected = Number.isInteger(messageId) && messageId <= id;
        element.classList.toggle('selected', selected);
        const checkbox = element.querySelector('.del_checkbox');
        if (checkbox instanceof HTMLInputElement) {
            checkbox.checked = selected;
        }
    });

    updateBar();
}

function onChatClickCapture(event) {
    if (!modeActive) {
        return;
    }
    const target = event.target instanceof Element ? event.target : null;
    const messageElement = target?.closest('#chat .mes[mesid]');
    if (!messageElement) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    selectUpTo(messageElement);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && modeActive) {
        event.preventDefault();
        exitMode();
    }
}

function enterMode() {
    if (modeActive) {
        return;
    }

    const chat = getContext().chat;
    if (!Array.isArray(chat) || chat.length === 0) {
        toastr.warning('Open a chat with messages first.', 'Bulk Exclude from Prompts');
        return;
    }

    if (isGenerating()) {
        toastr.warning('Wait for the current generation to finish.', 'Bulk Exclude from Prompts');
        return;
    }

    if ($('#dialogue_del_mes').is(':visible')) {
        toastr.warning('Finish the delete-messages mode first.', 'Bulk Exclude from Prompts');
        return;
    }

    ensureBar();
    modeActive = true;
    selectedEnd = null;
    sendFormDisplay = $('#send_form').css('display');

    document.body.classList.add('bulk-exclude-mode');
    $('#send_form').css('display', 'none');
    document.addEventListener('click', onChatClickCapture, true);
    document.addEventListener('keydown', onKeyDown, true);
    updateBar();
}

function exitMode() {
    if (!modeActive) {
        return;
    }

    modeActive = false;
    selectedEnd = null;

    document.body.classList.remove('bulk-exclude-mode');
    $('#send_form').css('display', sendFormDisplay || '');
    document.removeEventListener('click', onChatClickCapture, true);
    document.removeEventListener('keydown', onKeyDown, true);

    document.querySelectorAll('#chat .mes.selected').forEach(element => element.classList.remove('selected'));
    document.querySelectorAll('#chat .del_checkbox').forEach(checkbox => {
        if (checkbox instanceof HTMLInputElement) {
            checkbox.checked = false;
        }
    });

    updateBar();
}

function toggleMode() {
    if (modeActive) {
        exitMode();
    } else {
        enterMode();
    }
}

async function applySelection() {
    if (!modeActive || selectedEnd === null) {
        return;
    }

    const ok = document.getElementById('bulk_exclude_ok');
    if (ok?.classList.contains('disabled')) {
        return;
    }

    try {
        const context = getContext();
        const chat = context.chat;

        if (isGenerating()) {
            toastr.warning('Wait for the current generation to finish.', 'Bulk Exclude from Prompts');
            return;
        }

        const range = getRangeFromFirst(selectedEnd, chat.length);
        if (!range) {
            return;
        }

        const willChange = countStateChanges(chat, range.start, range.end, true);
        if (willChange === 0) {
            toastr.info('Every message in this range is already excluded from prompts.', 'Bulk Exclude from Prompts');
            exitMode();
            return;
        }

        await hideChatMessageRange(range.start, range.end, false);
        exitMode();
        toastr.success(`Excluded messages #${range.start + 1}–#${range.end + 1} from prompts.`, 'Bulk Exclude from Prompts');
    } catch (error) {
        console.error(LOG_PREFIX, 'Failed to exclude messages from prompts', error);
        toastr.error('Could not exclude the messages. See the console for details.', 'Bulk Exclude from Prompts');
    }
}

/* ------------------------------------------------------------------ */
/* Settings + init                                                     */
/* ------------------------------------------------------------------ */

async function addSettingsPanel() {
    const html = await renderExtensionTemplateAsync(`third-party/${EXTENSION_NAME}`, 'settings');
    $('#extensions_settings2').append(html);

    const settings = getSettings();
    $('#bulk_exclude_prompts_confirm')
        .prop('checked', settings.confirmBeforeChange)
        .on('change', function () {
            settings.confirmBeforeChange = Boolean($(this).prop('checked'));
            getContext().saveSettingsDebounced();
        });
}

jQuery(async () => {
    try {
        await addSettingsPanel();
        addWandMenuItem();
        injectAllButtons();
        observeChat();
        getContext().eventSource.on(getContext().eventTypes.CHAT_CHANGED, () => {
            exitMode();
            setTimeout(injectAllButtons, 100);
        });
        console.debug(LOG_PREFIX, `Extension loaded (v${VERSION}).`);
    } catch (error) {
        console.error(LOG_PREFIX, 'Failed to initialize', error);
    }
});
