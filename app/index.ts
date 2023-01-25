import Markdown from 'markdown-it';
import { AutojoinRoomsMixin, LogService, LogLevel, MatrixAuth, MatrixClient, RichConsoleLogger, SimpleFsStorageProvider, RustSdkCryptoStorageProvider } from 'matrix-bot-sdk';
import { startClient, awaitMoreInput, onMessage, changeAvatar, changeDisplayname } from 'matrix-bot-starter';

import { askLLM, changeModel, changeVoice, clearContext } from 'llm'
import { AUTOJOIN, ACCESS_TOKEN, BLACKLIST, HOMESERVER_URL, LOGINNAME, PASSWORD, REDIS_URL, WHITELIST, THREADS } from 'settings';
import { RedisStorageProvider } from 'storage';
import { MessageEvent } from 'types';

LogService.setLogger(new RichConsoleLogger());
// LogService.setLevel(LogLevel.DEBUG); // Show Matrix sync loop details - not needed most of the time
LogService.setLevel(LogLevel.INFO);
LogService.muteModule("Metrics");
LogService.trace = LogService.debug;

const md = Markdown();
const COMMANDS = `
| Command | Alias  |            Description            |
|:-------:|:------:|:---------------------------------:|
| picture | avatar |    Change bot profile picture.    |
|  name   | handle |      Change bot profile name.     |
|  clear  | reset  | Clear context for room or thread. |
`

async function onEvents(client : MatrixClient) {
    onMessage(client, 
        async (roomId : string, event : MessageEvent, sender: string, content: any, body: any, requestEventId: string, isEdit: boolean, isHtml: boolean, mentioned: string) => {
        if (BLACKLIST &&  BLACKLIST.split(" ").find(b => event.sender.endsWith(b))) return true;  // Ignore if on blacklist if set
        if (WHITELIST && !WHITELIST.split(" ").find(w => event.sender.endsWith(w))) return true;  // Ignore if not on whitelist if set
        if ((isHtml && mentioned) || client.dms.isDm(roomId)) {
            await Promise.all([
                client.sendReadReceipt(roomId, event.event_id),
                client.setTyping(roomId, true, 20000)
            ]);
            const command: string = mentioned.toLowerCase() //TODO: should be html not body?
            // TODO: clear mention from command if exists
            LogService.info('Index', `Received: ${command}`)
            if (command === 'picture' || command === 'avatar') {
                awaitMoreInput(client, roomId, event, true, 
                    {
                        description: 'avatar change',
                        messageType: 'm.image',
                        functionToExecute: changeAvatar
                    }, 
                    'Setting new avatar! If your next message is an image, I will update my avatar to that.',
                    false);    
            }
            else if (command === 'name' || command === 'handle') {
                awaitMoreInput(client, roomId, event, true, 
                    {
                        description: 'display name change',
                        messageType: 'm.text',
                        functionToExecute: changeDisplayname
                    }, 
                    'Setting new display name! I\'ll set it to the contents of your next message.',
                    false);
            }
            else if (command === 'model' || command === 'engine') {
                awaitMoreInput(client, roomId, event, true, 
                    {
                        description: 'model change',
                        messageType: 'm.text',
                        functionToExecute: changeModel
                    }, 
                    'I\'ll set the model to the content of your next message. Available actors: frontend-dev',
                    false);
            }
            else if (command === 'voice' || command === 'actor') {
                awaitMoreInput(client, roomId, event, true, 
                    {
                        description: 'voice change',
                        messageType: 'm.text',
                        functionToExecute: changeVoice
                    }, 
                    'I\'ll set the voice to the content of your next message. Available voices: frontend-dev',
                    false);
            }
            else if (command === 'clear'|| command === 'reset') {
                await clearContext(client, roomId, event)
            }
            else if (command === 'help' || command === 'commands') {
                client.replyNotice(roomId, event, COMMANDS, md.render(COMMANDS))
            }
            // TODO: check for secondary commands from moreInput before asking LLM
            else { await askLLM(client, roomId, event) }
            await client.setTyping(roomId, false, 500)
        }
    });
}

export async function setupClient() {
    const storage = REDIS_URL ? new SimpleFsStorageProvider('./data/bot.json') : new RedisStorageProvider('./data/bot.json');
    const crypto = new RustSdkCryptoStorageProvider('./data/crypto');
    const client = new MatrixClient(homeserverUrl, ACCESS_TOKEN, storage, crypto);

    globalThis.clientId = await client.getUserId();
    if (AUTOJOIN) AutojoinRoomsMixin.setupOnClient(client);
    await client.crypto.prepare(await client.getJoinedRooms());

    return client;
}

async function newClient() : Promise<MatrixClient> {
    if (!ACCESS_TOKEN){
        if (LOGINNAME !== undefined && PASSWORD !== undefined) {
            const authedClient = await (new MatrixAuth(HOMESERVER_URL)).passwordLogin(LOGINNAME, PASSWORD);
            LogService.info('Index', authedClient.homeserverUrl + " token: \n" + authedClient.accessToken)
            throw Error("Set ACCESS_TOKEN to above token, LOGINNAME and PASSWORD should now be blank")
        } else { throw Error("You need to set at least ACCESS_TOKEN") }
    }
    return setupClient().then(startClient);
}
newClient().then((client : MatrixClient) => {
    onEvents(client);
});
