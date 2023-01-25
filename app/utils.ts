import { htmlEncode } from "htmlencode";
import { MatrixClient, RichReply } from "matrix-bot-sdk";

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
