import { extension_settings, getContext, renderExtensionTemplateAsync } from '../../../extensions.js';
import { hideChatMessageRange } from '../../../chats.js';
import { isGenerating } from '../../../../script.js';
import { countStateChanges, getRangeFromFirst } from './logic.js?v=1.0.0';

const EXTENSION_NAME = 'ST-Bulk-Exclude-Prompts';
const SETTINGS_KEY = 'bulkExcludePrompts';
const LOG_PREFIX = '[Bulk Exclude from Prompts]';
const BUTTON_CLASS = 'mes_bulk_exclude_up';
const VERSION = '1.0.0';

const defaultSettings = {
    confirmBeforeChange: true,
};

let observer = null;

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
        injectAllButtons();
        observeChat();
        getContext().eventSource.on(getContext().eventTypes.CHAT_CHANGED, () => {
            setTimeout(injectAllButtons, 100);
        });
        console.debug(LOG_PREFIX, `Extension loaded (v${VERSION}).`);
    } catch (error) {
        console.error(LOG_PREFIX, 'Failed to initialize', error);
    }
});
