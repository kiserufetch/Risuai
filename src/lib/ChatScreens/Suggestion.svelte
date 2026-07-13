<script lang="ts">
	import { requestChatData } from "src/ts/process/request/request";
    import { doingChat, type OpenAIChat } from "../../ts/process/index.svelte";
    import { type character, type Message, type groupChat } from "../../ts/storage/database.svelte";
	import { DBState } from 'src/ts/stores.svelte';
    import { selectedCharID } from "../../ts/stores.svelte";
    import { isTauri } from 'src/ts/platform';
    import { translate } from "src/ts/translator/translator";
    import { CopyIcon, LanguagesIcon, RefreshCcwIcon } from "@lucide/svelte";
    import { alertConfirm } from "src/ts/alert";
    import { language } from "src/lang";
    import { isPhone } from "src/ts/stores.svelte";
    import { getUserName, replacePlaceholders } from "../../ts/util";
    import { onDestroy } from 'svelte';
    import { ParseMarkdown } from "src/ts/parser/parser.svelte";
    import {correctAutoSuggestPromptLanguage, defaultAutoSuggestPrompt} from "../../ts/storage/defaultPrompts.js";

    interface Props {
        send: () => any;
        messageInput: (string:string) => any;
    }

    let { send, messageInput }: Props = $props();
    let suggestMessages:string[] = $state(DBState.db.characters[$selectedCharID]?.chats[DBState.db.characters[$selectedCharID].chatPage]?.suggestMessages)
    let suggestMessagesTranslated:string[] = $state()
    let toggleTranslate:boolean = $state(DBState.db.autoTranslate)
    let progress:boolean = $state();
    let progressChatPage=-1;
    let abortController:AbortController|undefined;
    let suggestionRequestId = 0;
    let chatPage:number = $state()

    const cancelSuggestionRequest = () => {
        suggestionRequestId += 1
        progress = false
        abortController?.abort()
        abortController = undefined
    }

    const updateSuggestions = () => {
        if($selectedCharID > -1 && !$doingChat) {
            if(progressChatPage > 0 && progressChatPage != chatPage){
                cancelSuggestionRequest()
            }
            let currentChar = DBState.db.characters[$selectedCharID];
            suggestMessages = currentChar?.chats[currentChar.chatPage].suggestMessages
        }
    }

    const requestSuggestions = () => {
        if($doingChat || $selectedCharID <= -1 || (suggestMessages && suggestMessages.length > 0) || progress){
            return
        }

        const requestCharId = $selectedCharID
        const currentChar:character|groupChat = DBState.db.characters[requestCharId];
        if(!currentChar){
            return
        }
        const requestChatPage = currentChar.chatPage
        const currentChat = currentChar.chats[requestChatPage]
        if(!currentChat){
            return
        }
        let messages:Message[] = []
        
        messages = [...messages, ...currentChat.message];
        let lastMessages:Message[] = messages.slice(Math.max(messages.length - 10, 0));
        if(lastMessages.length === 0)
            return
        const prompt = correctAutoSuggestPromptLanguage(DBState.db.autoSuggestPrompt && DBState.db.autoSuggestPrompt.length > 0 ? DBState.db.autoSuggestPrompt : defaultAutoSuggestPrompt)
        let promptbody:OpenAIChat[] = [
            {
                role:'system',
                content: replacePlaceholders(prompt, currentChar.name)
            },
            {
                role: 'user', 
                content: lastMessages.map(b=>(b.role==='char'? currentChar.name : getUserName())+":"+b.data).reduce((a,b)=>a+','+b)
            }
        ]

        if(DBState.db.subModel === "textgen_webui" || DBState.db.subModel === 'mancer' || DBState.db.subModel.startsWith('local_')){
            promptbody = [
                {
                    role: 'system',
                    content: replacePlaceholders(correctAutoSuggestPromptLanguage(DBState.db.autoSuggestPrompt), currentChar.name)
                },
                ...lastMessages.map(({ role, data }) => ({
                    role: role === "user" ? "user" as const : "assistant" as const,
                    content: data,
                })),
            ]
        }

        const requestId = suggestionRequestId + 1
        const requestController = isTauri ? undefined : new AbortController()
        suggestionRequestId = requestId
        abortController = requestController
        progress = true
        progressChatPage = requestChatPage

        requestChatData({
            formated: promptbody,
            bias: {},
            currentChar : currentChar as character
        }, 'submodel', requestController?.signal ?? null).then(rq2=>{
            const stillCurrentRequest = suggestionRequestId === requestId && $selectedCharID === requestCharId && DBState.db.characters[requestCharId]?.chatPage === requestChatPage
            const currentTargetChat = DBState.db.characters[requestCharId]?.chats[requestChatPage]
            if(rq2.type !== 'fail' && rq2.type !== 'streaming' && rq2.type !== 'multiline' && progress && stillCurrentRequest && currentTargetChat){
                var suggestMessagesNew = rq2.result.split('\n').filter(msg => msg.startsWith('-')).map(msg => msg.replace('-','').trim())
                currentTargetChat.suggestMessages = suggestMessagesNew
                suggestMessages = suggestMessagesNew
            }
        }).catch(error => {
            if(!requestController?.signal.aborted && suggestionRequestId === requestId){
                console.error(error)
            }
        }).finally(() => {
            if(suggestionRequestId === requestId){
                progress = false
                abortController = undefined
            }
        })
    }

    const unsub = doingChat.subscribe(async (v) => {
        if(v) {
            cancelSuggestionRequest()
            suggestMessages = []
            return
        }
        requestSuggestions()
    })

    const translateSuggest = async (toggle, messages)=>{
        if(toggle && messages && messages.length > 0) {
            suggestMessagesTranslated = []
            for(let i = 0; i < suggestMessages.length; i++){
                let msg = suggestMessages[i]
                let translated = await translate(msg, false)
                suggestMessagesTranslated[i] = translated
            }
        }
    }

    onDestroy(() => {
        cancelSuggestionRequest()
        unsub()
    })

    $effect.pre(() => {
        $selectedCharID
        //FIXME add selectedChatPage for optimize render
        chatPage = DBState.db.characters[$selectedCharID].chatPage
        updateSuggestions()
    });
    $effect.pre(() => {translateSuggest(toggleTranslate, suggestMessages)});
</script>

<!-- Suggestion chips: single-line horizontal scroll on phones (ChatGPT-style),
     wrapping rows on larger screens. -->
<div class="flex px-3 md:px-4 py-1 gap-2 {$isPhone ? 'flex-nowrap overflow-x-auto no-scrollbar' : 'flex-wrap'}">
    {#if progress}
        <div class="flex items-center shrink-0 gap-2 rounded-full border border-darkborderc bg-darkbg px-4 py-2 text-sm text-textcolor2">
            <div class="loadmove"></div>
            <span class="whitespace-nowrap">{language.creatingSuggestions}</span>
        </div>
    {:else if !$doingChat}
        {#if DBState.db.translator !== ''}
            <button class={"flex items-center justify-center shrink-0 rounded-full border border-darkborderc bg-darkbg w-10 h-10 hover:bg-selected active:bg-selected transition-colors " + (toggleTranslate ? 'text-green-500' : 'text-textcolor2')}
                onclick={() => {
                    toggleTranslate = !toggleTranslate
                }}
            >
                <LanguagesIcon size={18}/>
            </button>
        {/if}

        <button class="flex items-center justify-center shrink-0 rounded-full border border-darkborderc bg-darkbg w-10 h-10 text-textcolor2 hover:bg-selected active:bg-selected transition-colors"
            onclick={() => {
                alertConfirm(language.askReRollAutoSuggestions).then((result) => {
                    if(result) {
                        suggestMessages = []
                        cancelSuggestionRequest()
                        requestSuggestions()
                    }
                })
            }}
        >
            <RefreshCcwIcon size={18}/>
        </button>
        {#each suggestMessages??[] as suggest, i}
            <div class="flex shrink-0 max-w-[85vw] md:max-w-md rounded-full border border-darkborderc bg-darkbg overflow-hidden">
                <button class="text-textcolor text-sm py-2 pl-4 pr-2 truncate hover:bg-selected active:bg-selected transition-colors risu-suggest-chip" onclick={() => {
                    suggestMessages = []
                    messageInput(suggest)
                    send()
                }}>
                {#await ParseMarkdown((DBState.db.translator !== '' && toggleTranslate && suggestMessagesTranslated && suggestMessagesTranslated.length > 0) ? suggestMessagesTranslated[i]??suggest : suggest) then md}
                    {@html md}
                {/await}
                </button>
                <button class="text-textcolor2 py-2 pl-2 pr-3 hover:bg-selected active:bg-selected hover:text-textcolor transition-colors" aria-label={language.hotkeyDesc.copy} onclick={() => {
                    messageInput(suggest)
                }}>
                    <CopyIcon size={16}/>
                </button>
            </div>
        {/each}
        
    {/if}
</div>

<style>
    
    .loadmove {
        animation: spin 1s linear infinite;
        border-radius: 50%;
        border: 0.2rem solid rgba(0,0,0,0);
        width: 1rem;
        height: 1rem;
        border-top: 0.2rem solid var(--risu-theme-textcolor);
        border-left: 0.2rem solid var(--risu-theme-textcolor);
    }

    /* Suggestions are single-line chips; flatten any block elements coming out
       of the markdown parser so truncation keeps working. */
    .risu-suggest-chip :global(:is(p, ul, ol, li, blockquote, pre, h1, h2, h3, h4, h5, h6)) {
        margin: 0;
        padding: 0;
        display: inline;
        white-space: nowrap;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>

