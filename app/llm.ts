import { LogService, MatrixClient } from "matrix-bot-sdk";

import { LLM_API_URL } from "settings";
import { Context, MessageEvent } from "types";

export async function changeModel(client: MatrixClient, roomId: string, event: any, ) {
    client.replyNotice(roomId, event, 'changeModel: Not implemented error!')
}

export async function changeVoice(client: MatrixClient, roomId: string, event: any, ) {
    client.replyNotice(roomId, event, 'changeVoice: Not implemented error!')
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
            client.replyNotice(roomId, event, `${output.response}`)
        } else {
            client.replyNotice(roomId, event, response.status + ': ' + response.statusText)
            LogService.error('LlmApi', response)
        } 
    }).catch((error: any) => {LogService.error('LlmApi', error)})
}

export async function storageKey(client: MatrixClient, roomId: string, event: any): Promise<string> {
    // const threadStartEventId = event['content']['m.relates_to'] ? event['content']['m.relates_to']['event_id'] : event['event_id'];
    return roomId // TODO: we need to know if this should be at the room level or the thread level.
}

export async function fetchContext(client: MatrixClient, roomId: string, event: any): Promise<Context> {
    const context = await client.storageProvider.readValue(await storageKey(client, roomId, event)) || "{}"
    return JSON.parse(context)
}

export async function storeContext(client: MatrixClient, roomId: string, event: any, context: Context) {
    await client.storageProvider.storeValue(await storageKey(client, roomId, event), JSON.stringify(context))
}
