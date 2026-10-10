export const DEFAULT_TEXT_SIZE=18;
export const TEXT_SIZES=[{value:16,label:'Standard'},{value:18,label:'Comfortable'},{value:20,label:'Large'},{value:22,label:'Extra large'}];
export function displayTextSize(value){return TEXT_SIZES.some(size=>size.value===value)?value:DEFAULT_TEXT_SIZE;}
export function nextTextSize(value,direction){const index=TEXT_SIZES.findIndex(size=>size.value===displayTextSize(value));return TEXT_SIZES[Math.min(TEXT_SIZES.length-1,Math.max(0,index+(direction<0?-1:1)))].value;}
