<script lang="ts">
    import type { character, groupChat, Message } from 'src/ts/storage/database.svelte';
    import { mount, onDestroy, unmount } from 'svelte';
    import Chat from './Chat.svelte';
    import { getCharImage } from 'src/ts/characters';
    import { createSimpleCharacter, DBState, selectedCharID, ReloadChatPointer } from 'src/ts/stores.svelte';
    import { chatFoldedStateMessageIndex } from 'src/ts/globalApi.svelte';
    import { get } from 'svelte/store';
    
    const getCurrentChatRoomId = () => {
        const charId = get(selectedCharID);
        if (charId < 0) return null;
        const char = DBState.db.characters[charId];
        if (!char) return null;
        return char.chats?.[char.chatPage]?.id ?? null;
    };

    let {
        messages,
        currentCharacter,
        onReroll,
        unReroll,
        currentUsername,
        userIcon,
        loadPages,
        userIconPortrait,
        hasNewUnreadMessage = $bindable(false)
    }:{
        messages: Message[]
        currentCharacter: character|groupChat
        onReroll: () => void
        unReroll: () => void
        currentUsername: string
        userIcon: string
        loadPages: number
        userIconPortrait?: boolean
        hasNewUnreadMessage?: boolean
    } = $props();

    // Reactive props handed to each imperatively mounted Chat instance. Mutating
    // these updates the mounted component in place (fine-grained reactivity),
    // which keeps streaming smooth: no unmount/remount per token chunk.
    type MountedProps = {
        message: string
        isLastMemory: boolean
        idx: number
        totalLength: number
        img: string | Promise<string>
        onReroll: () => void
        unReroll: () => void
        rerollIcon: 'dynamic'
        character: ReturnType<typeof createSimpleCharacter>
        largePortrait: boolean
        messageGenerationInfo: Message['generationInfo'] | null
        role: string
        name: string
        isComment: boolean
        disabled: boolean | 'allBefore'
    }
    type MountRecord = {
        inst: Record<string, any>
        props: MountedProps
        // Last message data synced from the DB. Kept separately from props.message
        // because edit mode mutates the bindable prop locally; comparing against
        // this instead of props.message avoids clobbering in-flight edits.
        lastData: string
    }

    let chatBody: HTMLDivElement;
    let hashes: Set<number> = new Set();
    let mountRecords: Map<number, MountRecord> = new Map();

    //Non-cryptographic hash function to generate a unique hash for each message
    function hashCode(str:string):number {
        let hash = 0;
        for (let i = 0, len = str.length; i < len; i++) {
            let chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        if(hash == 0){
            hash = 1; // Ensure hash is not zero
        }
        return hash;
    }

    const updateChatBody = () => {
        if(!chatBody){
            return
        }

        let nextHash = 0;
        let currentHashes: Set<number> = new Set();
        const charImage = getCharImage(currentCharacter.image, 'css')
        const userImage = getCharImage(userIcon, 'css')
        const simpleChar = createSimpleCharacter(currentCharacter);
        const roomKey = getCurrentChatRoomId() ?? ''
        let loadStart = messages.length - 1
        let loadEnd = messages.length - loadPages

        if(chatFoldedStateMessageIndex.index !== -1){
            loadStart = chatFoldedStateMessageIndex.index
            loadEnd = Math.max(0, chatFoldedStateMessageIndex.index - loadPages)
        }

        const reloadPointerMap = get(ReloadChatPointer);

        for(let i=loadStart ; i >= loadEnd; i--){
            if(i < 0) break; // Prevent out of bounds
            const message = messages[i];
            const messageLargePortrait = message.role === 'user' ? (userIconPortrait ?? false) : ((currentCharacter as character).largePortrait ?? false);
            const reloadPointer = reloadPointerMap[i] ?? 0;
            // Identity hash: message content is intentionally NOT part of it, so
            // streaming/edits update the existing component through props instead
            // of remounting (which would re-parse markdown and flash images).
            const hashd = roomKey + '|' + (message.chatId ?? '') + '|' + i.toString() + '|' + messageLargePortrait.toString() + '|' + (message.role ?? '') + '|' + (message.isComment ?? false).toString() + '|' + reloadPointer.toString();
            const currentHash = hashCode(hashd);
            currentHashes.add(currentHash);
            const existing = mountRecords.get(currentHash);
            if(existing){
                const p = existing.props;
                if(existing.lastData !== message.data){
                    existing.lastData = message.data;
                    p.message = message.data;
                }
                if(p.totalLength !== messages.length) p.totalLength = messages.length;
                if(p.messageGenerationInfo !== (message.generationInfo ?? null)) p.messageGenerationInfo = message.generationInfo ?? null;
                if(p.disabled !== (message.disabled ?? false)) p.disabled = message.disabled ?? false;
                const nameVal = message.role === 'user' ? currentUsername : currentCharacter.name;
                if(p.name !== nameVal) p.name = nameVal;
            }
            else{
                const b = document.createElement('div');
                b.setAttribute('x-hashed', currentHash.toString());
                b.classList.add('chat-message-container');
                const props: MountedProps = $state({
                    message: message.data,
                    isLastMemory: false,
                    idx: i,
                    totalLength: messages.length,
                    img: message.role === 'user' ? userImage : charImage,
                    onReroll: onReroll,
                    unReroll: unReroll,
                    rerollIcon: 'dynamic',
                    character: simpleChar,
                    largePortrait: messageLargePortrait,
                    messageGenerationInfo: message.generationInfo ?? null,
                    role: message.role,
                    name: message.role === 'user' ? currentUsername : currentCharacter.name,
                    isComment: message.isComment ?? false,
                    disabled: message.disabled ?? false,
                })
                const inst = mount(Chat, {
                    target: b,
                    props,
                })
                mountRecords.set(currentHash, { inst, props, lastData: message.data });
                const nextElement = nextHash === 0 ? null : chatBody.querySelector(`[x-hashed="${nextHash}"]`);
                if(nextElement){
                    chatBody.insertBefore(b, nextElement?.nextSibling);
                }
                else{
                    chatBody.prepend(b);
                }
            }
            nextHash = currentHash;
            
        }

        //@ts-expect-error Set<T> requires type arg, and Set.difference needs 'esnext' lib (polyfilled by Core-js)
        const toRemove:Set = hashes.difference(currentHashes);
        toRemove.forEach((hash) => {
            const record = mountRecords.get(hash);
            if(record){
                unmount(record.inst);
                mountRecords.delete(hash);
            }
            const element = chatBody.querySelector(`[x-hashed="${hash}"]`);
            if(element){
                chatBody.removeChild(element);
            }
        });

        hashes = currentHashes;
        
    };

    onDestroy(() => {
        hashes.clear();
        mountRecords.forEach((record) => {
            unmount(record.inst);
        });
        mountRecords.clear();
    })

    function checkIfAtBottom() {
        if (!chatBody || !chatBody.parentElement) return true;
        const sc = chatBody.parentElement;
        const lastEl = chatBody.firstElementChild;
        if (!lastEl) return true;
        const rect = lastEl.getBoundingClientRect();
        const scRect = sc.getBoundingClientRect();
        return rect.top <= scRect.bottom + 100;
    }

    export const scrollToLatestMessage = (behavior: ScrollBehavior = 'instant') => {
        if(!chatBody) return;
        hasNewUnreadMessage = false;
        const element = chatBody.firstElementChild;
        if(element){
             element.scrollIntoView({ behavior, block: 'start' });
        }
    }

    let previousLength = 0;
    let previousChatRoomId: string | null = null;

    $effect(() => {
        void $ReloadChatPointer; // Make $effect track ReloadChatPointer changes
        const wasAtBottom = checkIfAtBottom();
        updateChatBody()
        
        const currentChatRoomId = getCurrentChatRoomId();
        const isSameChat = currentChatRoomId === previousChatRoomId;
        
        if(!isSameChat && previousChatRoomId !== null){
            // Entering another chat: land at the latest message like any messenger.
            requestAnimationFrame(() => scrollToLatestMessage('instant'));
        }
        else if(isSameChat && messages.length > previousLength){
            const lastMsg = messages[messages.length - 1];
            if(lastMsg && lastMsg.role === 'user'){
                // The user just sent a message: always bring it into view.
                requestAnimationFrame(() => scrollToLatestMessage(wasAtBottom ? 'instant' : 'smooth'));
            }
            else if(lastMsg && lastMsg.role === 'char' && DBState.db.autoScrollToNewMessage){
                if(wasAtBottom || DBState.db.alwaysScrollToNewMessage){
                    // The column-reverse container already pins to the bottom while
                    // scrolled there; this just normalizes the position right after
                    // the new message element is inserted.
                    requestAnimationFrame(() => scrollToLatestMessage('instant'));
                } else {
                    hasNewUnreadMessage = true;
                }
            }
        }
        previousLength = messages.length;
        previousChatRoomId = currentChatRoomId;
    })

</script>

<div class="flex flex-col-reverse risu-chats" bind:this={chatBody}></div>
