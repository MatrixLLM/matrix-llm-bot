import Markdown from 'markdown-it';

import { LogService, MatrixClient } from "matrix-bot-sdk";

import { LLM_API_URL, THREADS } from "settings";
import { Context, MessageEvent } from "types";
import { replyNotice } from 'utils';

const md = Markdown();

export async function changeAvatar(client: MatrixClient, roomId : string, event : any) {
    client.setAvatarUrl(event.content.url).then(() => {
        replyNotice(client, roomId, event, 'Avatar updated!', THREADS)
    });
}

export async function changeDisplayname(client: MatrixClient, roomId: string, event: any, ) {
    client.setDisplayName(event.content.body).then(() => {
        replyNotice(client, roomId, event, 'Updated display name!', THREADS)
    });  
}

export async function changeModel(client: MatrixClient, roomId: string, event: any) {
    replyNotice(client, roomId, event, 'changeModel: Not implemented error!', THREADS)
}

export async function changeVoice(client: MatrixClient, roomId: string, event: any, ) {
    replyNotice(client, roomId, event, 'changeVoice: Not implemented error!', THREADS)
}

export async function clearContext(client: MatrixClient, roomId: string, event: any, ) {
    storeContext(client, roomId, event, {}).then(() => {
        replyNotice(client, roomId, event, 'Context cleared', THREADS)
    });
}

export async function askLLM(client: MatrixClient, roomId: string, event: MessageEvent, llm="chatgpt") {
    const body: any = {'message': event.content.body, 'llm': llm}
    const context: any = await fetchContext(client, roomId, event)
    if(context.conversationId) body['conversationId'] = context.conversationId
    if(context.parentMessageId) body['parentMessageId'] = context.parentMessageId
    LogService.info('LlmApi', `conversationId: ${body.conversationId} parentMessageId: ${body.parentMessageId}`)
    await fetch(LLM_API_URL, {method: 'POST', headers: {'content-type': 'application/json;charset=UTF-8'},
        body: JSON.stringify(body),
    }).then(async (response: any) => {
        if (response.ok) {
            const output = await response.json() // TODO: error handling for if JSON is bad
            console.log(output)
            storeContext(client, roomId, event, {
                'conversationId': output.conversationId,
                'parentMessageId': output.messageId // TODO: fix upstream to use output.parentMessageId
            })
            replyNotice(client, roomId, event, output.response, THREADS, md.render(output.response))
        } else {
            replyNotice(client, roomId, event, response.status + ': ' + response.statusText, THREADS)
            LogService.error('LlmApi', response)
        } 
    }).catch((error: any) => {LogService.error('LlmApi', error)})
}

export async function fetchContext(client: MatrixClient, roomId: string, event: any): Promise<Context> {
    const storageKey = event.content['m.relates_to']?.event_id ?
        reverseColon(roomId) + ":" + event.content['m.relates_to'].event_id : reverseColon(roomId)
    LogService.info('Context', "read using key: " + storageKey)
    return JSON.parse(await client.storageProvider.readValue(storageKey) || "{}")
}

export async function storeContext(client: MatrixClient, roomId: string, event: any, context: Context) {
    const storageKey = event.content['m.relates_to']?.event_id ?
        reverseColon(roomId) + ":" + event.content['m.relates_to'].event_id : reverseColon(roomId)
    LogService.info('Context', "save using key: " + storageKey)
    await client.storageProvider.storeValue(storageKey, JSON.stringify(context))
    // if storing by room key also store by event key so future threads can use these values
    if (storageKey === reverseColon(roomId)) await client.storageProvider.storeValue(reverseColon(roomId) + ":" + event.event_id, JSON.stringify(context))
}

function reverseColon(roomId: string) {
    return roomId.split(":")[1] + ":" + roomId.split(":")[0]
}
