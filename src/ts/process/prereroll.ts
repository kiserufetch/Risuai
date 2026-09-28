let rerolls:{[key:string]:string[]} = {};
let rerollIndex:{[key:string]:number} = {};

export function Prereroll(genId:string){
    if(rerolls[genId]){
        let index = rerollIndex[genId];
        index += 1;
        rerollIndex[genId] = index;
        return rerolls[genId][index] ?? null;
    }
    return null;
}
export function PreUnreroll(genId:string){
    if(rerolls[genId]){
        let index = rerollIndex[genId];
        index -= 1;
        if(index < 0){
            return null
        }
        rerollIndex[genId] = index;
        return rerolls[genId][index] ?? null;
    }
    return null;
}

export function addRerolls(genId:string, values:string[]){
    rerolls[genId] = values;
    rerollIndex[genId] = 0;
}

export function getPrerollState(genId:string):{index:number,total:number}|null{
    const values = rerolls[genId]
    if(!values || values.length === 0){
        return null
    }
    const index = Math.min(Math.max(rerollIndex[genId] ?? 0, 0), values.length - 1)
    return { index, total: values.length }
}