import { htmlEncode } from "htmlencode";
import { MatrixClient, RichReply } from "matrix-bot-sdk";

import { THREADS } from "settings";

 /**
     * Unfortunately we need this until this PR is merged: https://github.com/turt2live/matrix-bot-sdk/pull/295
     * Replies to a given event with the given text. The event is sent with a msgtype of m.notice.
     * The message will be encrypted if the client supports encryption and the room is encrypted.
     * @param {MatrixClient} client the matrix client to us
     * @param {string} roomId the room ID to reply in
     * @param {any} event the event to reply to
     * @param {string} text the text to reply with
     * @param {boolean} thread whether to reply into a thread
     * @param {string} html the HTML to reply with, or falsey to use the `text`
     * @returns {Promise<string>} resolves to the event ID which was sent
     */
 export function replyNotice(client: MatrixClient, roomId: string, event: any, text: string, thread = false, html: string = ""): Promise<string> {
     if (!html) html = htmlEncode(text);

     const reply = RichReply.createFor(roomId, event, text, html);
     reply['msgtype'] = 'm.notice';
     if (thread) {
         const threadStartEventId = event['content']['m.relates_to'] ? event['content']['m.relates_to']['event_id'] : event['event_id'];
         reply['m.relates_to'] = {
             'rel_type': 'm.thread',
             'event_id': threadStartEventId,
         };
     }
     return client.sendMessage(roomId, reply);
 }


/**
 * An object for use in multi message commands
 * It defines what the next message should be and what to do with that message
 * 
 * @param description - Description of what the command does, used to send error messages: `Incorrect message type! Cancelling ${description}`
 * @param messageType - Message type to wait for. Possible values include m.message, m.file, m.image... @see {@link https://spec.matrix.org/latest/client-server-api/#mroommessage-msgtypes}
 * @param functionToExecute - Function to run if the next message from the sender is permitted and of the correct type.
 * @param data - Optional data to pass to the next step
 */
export interface AwaitMoreInputOptions {
    description: string,
    messageType: string,
    functionToExecute: (client: MatrixClient, roomId: string, event: any, options: AwaitMoreInputOptions) => Promise<void> | void,
    data?: any
}

// An object that holds multi message commands that are being handled
let awaitCommandQueue : {[queueId: string] : AwaitMoreInputOptions} = {}


/**
 * A function that will allow creating a command that awaits additional input from the user of a specific type
 * Optionally allowing the command to be locked for people without a certain amount of permissions
 * 
 * @param {MatrixClient} client - The bot client, generated from @see generateAndStartClient
 * @param {string} roomId - The id of the room to send the message in
 * @param {any} event - The event object returned by on.message/sendmessage
 * @param {boolean} requiresManagePermission - true/false on whether elevated permissions are needed to run this command
 * @param {AwaitMoreInputOptions} awaitMoreInputOptions - Object that defines what type of message to wait for and what to do with it afterwards. @see AwaitMoreInputOptions 
 * @param {string} [notice] - Notice message to send when the first part of the command is issued
 * @param {boolean} [noticeInThread] - Whether to send the notice in a thread
 * @returns 
 */
export async function awaitMoreInput(client: MatrixClient, roomId: string, event: any, requiresManagePermission : boolean, awaitMoreInputOptions: AwaitMoreInputOptions, notice?: string, noticeInThread: boolean = false) {
    const senderId = event['sender'];

    if (requiresManagePermission) {
        // If the sender is allowed to kick, they're allowed to manage the bot
        let allowedToManageBot = await client.userHasPowerLevelFor(senderId, roomId, 'kick', true);
        if (!allowedToManageBot) {
            client.replyNotice(roomId, event, 'My apologies! You need to have the \'kick\' permission to change my settings.');
            return;
        }
    }

    if (!notice) {
        return;
    }

    if (!noticeInThread) {
        awaitCommandQueue[senderId] = awaitMoreInputOptions;
        console.log(`Awaiting command queue with: ${senderId}`)
        client.replyNotice(roomId, event, notice);
    } else {
        const threadStartEventId: string = event['content']['m.relates_to'] ? event['content']['m.relates_to']['event_id'] : event['event_id'];
        awaitCommandQueue[senderId + threadStartEventId] = awaitMoreInputOptions;
        console.log(`Awaiting command queue with: ${senderId + threadStartEventId}`)
        client.sendMessage(roomId, {
            body: notice,
            msgtype: 'm.notice',
            'm.relates_to': {
                'rel_type': 'm.thread',
                'event_id': threadStartEventId
            }
        });
    }
}

/**
 * A helper function that runs any multi message commands currently in queue
 * This gets called automatically if you use @see client-setup.onMessage
 * Otherwise, you can simply just run it on.message, with no additional setup needed
 * 
 * @param client - The bot client, generated from @see generateAndStartClient
 * @param roomId - The id of the room to send the message in
 * @param event - The event object returned by on.message/sendmessage, that possibly contains the second part of a multi message command
 * @param content - The content of the event
 * @param lookupKey - The lookupKey of the event (sender normally, sender + threadStartEventId if this is a thread.)
 */
export function checkAwaitCommands(client: MatrixClient, roomId: string, event: any, content: any, lookupKey: string) {
    const commandAwaitedFromLookupKey = lookupKey in awaitCommandQueue;

    if (commandAwaitedFromLookupKey) {
        let awaitMoreInputOptions : AwaitMoreInputOptions = awaitCommandQueue[lookupKey];
        if (awaitMoreInputOptions.messageType != content['msgtype']) {
            client.replyNotice(roomId, event, `Incorrect message type! Cancelling ${awaitMoreInputOptions.description}`);
        }
        else {
            awaitMoreInputOptions.functionToExecute(client, roomId, event, awaitMoreInputOptions);
        }
        delete awaitCommandQueue[lookupKey];
    }
}

/**
 * A function that uses client.on('room.message') to expand its functionality
 * - Giving you extra variables besides roomId & event ( @see onMessageCallback )
 * - Automatically skips messages without content
 * - Automatically skips messages sent by the client/bot itself
 * - Automatically handles the second part of multi message commands. @see runMultiMessageCommand
 * 
 * @param client - The bot client, generated from @see generateAndStartClient
 * @param {onMessageCallback} callback - The callback that handles the message
 * 
 */
/**
 * @callback onMessageCallback
 * 
 * @param {string} roomId - The id of the room the event was sent in
 * @param {any} event - The event object of the message
 * @param {string} sender - The id of the message sender
 * @param {any} content - The content of the message
 * @param {any} body - The body of the content
 * @param {string} requestEventId - The event id of the message
 * @param {boolean} isEdit - Returns whether the message is an edit or not
 * @param {boolean} isHtml - Returns whether the message is written in HTML or not
 * @param {string} mentioned - Returns '' if the client/bot is not mentioned, or the HTML string of the mention itself if the client/bot *is* mentioned
 */

export function onMessage(client: MatrixClient, 
    callback : (roomId: string, event: any, sender: string, content: any,
                body: any, requestEventId: string, isEdit: boolean, isHtml: boolean, mentioned: string ) => {}) {
    client.on('room.message', async (roomId, event) => { 
        if (!event['content']) return;  // If no content, skip
        
        const sender = event['sender'];
        const clientId = await client.getUserId()
        if (sender == clientId) return;  // If message is from this bot, skip
        
        const content = event['content'];
        const body = content['body'];
        let requestEventId = event['event_id'];

        const isEdit = 'm.new_content' in content;
        const isHtml = 'formatted_body' in content;

        let mentioned : string = '';
        if (isHtml) {
            const selfEscaped = clientId.replace(/\./g, '\\.');
            const regexSelfMention = new RegExp(`<a href=".*?${selfEscaped}">.*?<\/a>[:]`, 'g');

            const formatted_body = content['formatted_body'];
            const mentionString = formatted_body.match(regexSelfMention);
            if (mentionString != null) {
                mentioned = formatted_body.replace(mentionString, '').trimStart();
            }
        }

        const threadStartEventId: string = (THREADS && event['content']['m.relates_to']) ? event['content']['m.relates_to']['event_id'] : undefined;
        const lookupKey = threadStartEventId ? sender + threadStartEventId : sender
        console.log(`Checking await commands with: ${lookupKey}`)
        checkAwaitCommands(client, roomId, event, content, lookupKey);

        callback(roomId, event, sender, content, body, requestEventId, isEdit, isHtml, mentioned);
    });
}
