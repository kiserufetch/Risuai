import { v4 } from 'uuid'
import { changeChatTo } from 'src/ts/globalApi.svelte'
import { haptic } from 'src/ts/gui/haptics'
import { DBState, MobileSideBar, ReloadGUIPointer, selectedCharID } from 'src/ts/stores.svelte'
import { findCharacterbyId } from 'src/ts/util'
import { get } from 'svelte/store'

/** MobileHeader.newChat: prepend an empty chat (group chats get every member's greeting). */
export function createNewChat(): void {
    const cha = DBState.db.characters[get(selectedCharID)]
    if (!cha) {
        return
    }
    haptic(6)
    const len = cha.chats.length
    const chats = cha.chats
    chats.unshift({
        message: [], note: '', name: `New Chat ${len + 1}`, localLore: [], fmIndex: -1, id: v4(),
    })
    if (cha.type === 'group') {
        cha.characters.map((c) => {
            chats[0].message.push({
                saying: c,
                role: 'char',
                data: findCharacterbyId(c).firstMessage,
            })
        })
    }
    cha.chats = chats
    changeChatTo(0)
    MobileSideBar.set(0)
    ReloadGUIPointer.update((v) => v + 1)
}
