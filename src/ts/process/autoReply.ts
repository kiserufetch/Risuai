import { get } from "svelte/store";
import { getDatabase, type character, type groupChat } from "../storage/database.svelte";
import { selectedCharID } from "../stores.svelte";
import { requestChatData } from "./request/request";
import type { OpenAIChat } from "./index.svelte";
import { getPersonaPrompt, getUserName, replacePlaceholders } from "../util";
import { alertError } from "../alert";

const HISTORY_WINDOW = 20
const CONTEXT_CHAR_LIMIT = 4000

const trimContext = (text:string) => {
    const trimmed = text.trim()
    return trimmed.length > CONTEXT_CHAR_LIMIT ? trimmed.slice(0, CONTEXT_CHAR_LIMIT) : trimmed
}

export function cleanAutoReplyOutput(output:string, userName:string, charName:string):string {
    let text = output.replace(/<Thoughts>[\s\S]*?<\/Thoughts>/g, '').trim()

    //take only the first paragraph if the model rambles
    text = text.split(/\r?\n\s*\r?\n/).map(v => v.trim()).find(v => v.length > 0) ?? ''

    //if the model returned a list anyway, keep only the first entry
    const lines = text.split(/\r?\n/).map(v => v.trim()).filter(v => v.length > 0)
    if(lines.length > 1 && /^([-*•]|\d+[.)])\s/.test(lines[0])){
        text = lines[0]
    }
    text = text.replace(/^([-*•]|\d+[.)])\s+/, '')

    //strip speaker prefixes like "User:" or "{{user}}:"
    const speakerPrefixes = ['{{user}}', 'user', userName, charName].filter(v => v && v.length > 0)
    for(const prefix of speakerPrefixes){
        if(text.toLowerCase().startsWith(prefix.toLowerCase() + ':')){
            text = text.slice(prefix.length + 1).trim()
            break
        }
    }

    //strip quotes that wrap the whole message
    const quotePairs:[string,string][] = [['"','"'], ["'","'"], ['“','”'], ['„','“'], ['«','»'], ['「','」'], ['`','`']]
    for(const [open, close] of quotePairs){
        if(text.length > open.length + close.length && text.startsWith(open) && text.endsWith(close)){
            const inner = text.slice(open.length, text.length - close.length)
            if(!inner.includes(open) && !inner.includes(close)){
                text = inner.trim()
            }
            break
        }
    }

    return text.trim()
}

export async function generateAutoReply():Promise<string|null> {
    const db = getDatabase()
    const charId = get(selectedCharID)
    const currentChar:character|groupChat = db.characters[charId]
    if(charId < 0 || !currentChar){
        return null
    }
    const chat = currentChar.chats[currentChar.chatPage]
    if(!chat){
        return null
    }

    const userName = getUserName()
    const charName = currentChar.name

    const messages = chat.message ?? []
    const lastMessages = messages.slice(Math.max(messages.length - HISTORY_WINDOW, 0))

    const history:{speaker:string, text:string}[] = []
    if(currentChar.type !== 'group' && messages.length < HISTORY_WINDOW){
        const fmIndex = chat.fmIndex ?? -1
        const greeting = fmIndex === -1 ? currentChar.firstMessage : currentChar.alternateGreetings?.[fmIndex]
        if(greeting && greeting.trim().length > 0){
            history.push({ speaker: charName, text: greeting.trim() })
        }
    }
    for(const message of lastMessages){
        if(!message.data || message.data.trim().length === 0){
            continue
        }
        let speaker = message.role === 'user' ? (message.name ?? userName) : charName
        if(message.role === 'char' && message.saying){
            speaker = db.characters.find(c => c.chaId === message.saying)?.name ?? charName
        }
        history.push({ speaker, text: message.data })
    }

    if(history.length === 0){
        alertError('There is no conversation to reply to yet.')
        return null
    }

    let characterContext = ''
    if(currentChar.type !== 'group' && currentChar.desc && currentChar.desc.trim().length > 0){
        characterContext = trimContext(replacePlaceholders(currentChar.desc, currentChar.name))
    }
    const personaContext = trimContext(replacePlaceholders(getPersonaPrompt() ?? '', currentChar.name))

    const systemPrompt = [
        `You are writing on behalf of the user in a fictional roleplay chat. Put yourself in the user's place: impersonate "${userName}" and write the single next message ${userName} would send to continue the conversation below.`,
        characterContext ? `Description of "${charName}":\n${characterContext}` : '',
        personaContext ? `Description of "${userName}" (the user you are impersonating):\n${personaContext}` : '',
        `Rules:
- Continue the conversation naturally, staying in character as ${userName}.
- Keep the reply short: 1 to 3 sentences. Do not write a long monologue.
- Write the reply in the same language the conversation is written in.
- Output ONLY the reply text itself. Do not wrap it in quotation marks, and do not add a "${userName}:" prefix, explanations, notes, lists or headers.`
    ].filter(v => v.length > 0).join('\n\n')

    const conversationLog = history.map(m => `${m.speaker}: ${m.text}`).join('\n')

    const promptbody:OpenAIChat[] = [
        {
            role: 'system',
            content: systemPrompt
        },
        {
            role: 'user',
            content: `Conversation so far:\n${conversationLog}\n\nWrite ${userName}'s next message now.`
        }
    ]

    const rq = await requestChatData({
        formated: promptbody,
        bias: {},
        currentChar: currentChar as character,
        useStreaming: false,
        noMultiGen: true
    }, 'submodel')

    if(rq.type === 'fail'){
        alertError(rq.result)
        return null
    }
    if(rq.type === 'streaming' || rq.type === 'multiline'){
        alertError('Unexpected response type while generating the auto reply')
        return null
    }

    const cleaned = cleanAutoReplyOutput(rq.result, userName, charName)
    if(cleaned.length === 0){
        alertError('The model returned an empty auto reply')
        return null
    }
    return cleaned
}
