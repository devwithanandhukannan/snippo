"use strict";(()=>{var x=class{maxTriggerLength=32;minTriggerLength=1;triggerMap=new Map;constructor(t){t&&this.updateIndex(t)}updateIndex(t){this.triggerMap.clear();let n=1,e=1e3;for(let[i,r]of Object.entries(t))r.enabled&&(this.triggerMap.set(i,r.id),i.length>n&&(n=i.length),i.length<e&&(e=i.length));this.maxTriggerLength=n,this.minTriggerLength=e===1e3?1:e}matchTail(t){if(!t||this.triggerMap.size===0)return null;let n=t.length,e=Math.min(n,this.maxTriggerLength);for(let i=e;i>=this.minTriggerLength;i--){let r=t.slice(n-i),s=this.triggerMap.get(r);if(s)return{matchedTrigger:r,snippetId:s,tailLength:i}}return null}couldTriggerEnd(t,n){return!!t}getTriggerCount(){return this.triggerMap.size}hasTrigger(t){return this.triggerMap.has(t)}};var T=class{static resolve(t,n={}){if(!t)return{text:""};let e=n.now||new Date,i,r=t.replace(/\{\{?([a-zA-Z0-9_:]+)\}?\}/g,(o,l)=>{switch(l.toLowerCase()){case"date":return e.toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"});case"date:iso":return e.toISOString().split("T")[0];case"date:short":return e.toLocaleDateString(void 0,{year:"numeric",month:"2-digit",day:"2-digit"});case"time":return e.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"});case"time:24":return e.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1});case"day":return e.toLocaleDateString(void 0,{weekday:"long"});case"year":return e.getFullYear().toString();case"month":return e.toLocaleDateString(void 0,{month:"long"});case"clipboard":return n.clipboardText??"";case"cursor":return"__VERBATIM_CURSOR__";default:return o}}),s="__VERBATIM_CURSOR__",a=r.indexOf(s);return a!==-1&&(i=a,r=r.replace(s,"")),{text:r,cursorOffset:i}}static getAvailableVariables(){let t=new Date;return[{tag:"{date}",label:"Date",preview:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})},{tag:"{date:short}",label:"Short Date",preview:t.toLocaleDateString(void 0,{year:"numeric",month:"2-digit",day:"2-digit"})},{tag:"{date:iso}",label:"ISO Date",preview:t.toISOString().split("T")[0]},{tag:"{time}",label:"Time",preview:t.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"})},{tag:"{time:24}",label:"24h Time",preview:t.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1})},{tag:"{day}",label:"Day",preview:t.toLocaleDateString(void 0,{weekday:"long"})},{tag:"{month}",label:"Month",preview:t.toLocaleDateString(void 0,{month:"long"})},{tag:"{year}",label:"Year",preview:t.getFullYear().toString()}]}};var p=class{static getTail(t,n=32){let e=t.selectionEnd??t.value.length,i=Math.max(0,e-n);return t.value.slice(i,e)}static replaceTrigger(t,n,e,i,r){let s=t.selectionEnd??t.value.length,a=Math.max(0,s-n),o=e.text;if(typeof t.setRangeText=="function"?t.setRangeText(o,a,s,"end"):(t.value=t.value.slice(0,a)+o+t.value.slice(s),t.selectionStart=t.selectionEnd=a+o.length),e.cursorOffset!==void 0){let l=a+e.cursorOffset;t.setSelectionRange(l,l)}try{let l=new InputEvent("input",{bubbles:!0,cancelable:!0,inputType:"insertReplacementText",data:o});t.dispatchEvent(l)}catch{t.dispatchEvent(new Event("input",{bubbles:!0}))}return t.dispatchEvent(new Event("change",{bubbles:!0})),{id:"undo-"+Date.now(),snippetId:i,trigger:r,expandedText:o,timestamp:Date.now(),editorType:"plain-input",restoreData:{startOffset:a,endOffset:a+o.length,originalTriggerText:r}}}static undo(t,n){let{startOffset:e,endOffset:i,originalTriggerText:r}=n.restoreData;typeof t.setRangeText=="function"?t.setRangeText(r,e,i,"end"):(t.value=t.value.slice(0,e)+r+t.value.slice(i),t.selectionStart=t.selectionEnd=e+r.length),t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0}))}static getCaretCoordinates(t){let n=t.getBoundingClientRect();return{x:n.left+16,y:n.top-8,height:24}}};var g=class{static getTail(t,n=32){let e=window.getSelection();if(!e||e.rangeCount===0)return"";let i=e.getRangeAt(0);if(i.startContainer.nodeType===Node.TEXT_NODE&&i.startContainer.textContent){let r=i.startContainer.textContent,s=i.startOffset,a=Math.max(0,s-n),o=r.slice(a,s);if(o)return o}try{let r=i.cloneRange();r.selectNodeContents(t),r.setEnd(i.startContainer,i.startOffset);let s=r.toString();if(s)return s.slice(Math.max(0,s.length-n))}catch{}try{let r=(t.innerText||t.textContent||"").replace(/\r?\n$/,"");if(r)return r.slice(Math.max(0,r.length-n))}catch{}return""}static replaceTrigger(t,n,e,i,r){let s=window.getSelection();if(!s||s.rangeCount===0)return null;let a=e.text,o=!1;try{s.collapseToEnd();for(let c=0;c<n;c++)s.modify?.("extend","backward","character");let l=s.toString();(l.length===n||l===r)&&(o=document.execCommand("insertText",!1,a))}catch{o=!1}if(!o&&s.rangeCount>0)try{let l=s.getRangeAt(0);if(l.startContainer.nodeType===Node.TEXT_NODE){let c=l.startContainer,u=l.startOffset,L=Math.max(0,u-n),m=document.createRange();m.setStart(c,L),m.setEnd(c,u),s.removeAllRanges(),s.addRange(m);try{o=document.execCommand("insertText",!1,a)}catch{o=!1}if(!o){m.deleteContents();let w=document.createTextNode(a);m.insertNode(w);let v=document.createRange();v.setStartAfter(w),v.collapse(!0),s.removeAllRanges(),s.addRange(v),o=!0;try{t.dispatchEvent(new InputEvent("input",{bubbles:!0,cancelable:!0,inputType:"insertReplacementText",data:a}))}catch{t.dispatchEvent(new Event("input",{bubbles:!0}))}}}}catch{}if(e.cursorOffset!==void 0)try{let l=window.getSelection();if(l&&l.rangeCount>0){let c=a.length-e.cursorOffset;for(let u=0;u<c;u++)l.modify?.("move","backward","character")}}catch{}return{id:"undo-"+Date.now(),snippetId:i,trigger:r,expandedText:a,timestamp:Date.now(),editorType:"rich-editable",restoreData:{startOffset:0,endOffset:a.length,originalTriggerText:r}}}static undo(t,n){try{if(document.execCommand("undo"))return}catch{}let e=window.getSelection();if(e)try{e.collapseToEnd();for(let i=0;i<n.expandedText.length;i++)e.modify?.("extend","backward","character");document.execCommand("insertText",!1,n.restoreData.originalTriggerText)}catch{}}static getCaretCoordinates(t){let n=window.getSelection();if(!n||n.rangeCount===0)return null;try{let i=n.getRangeAt(0).cloneRange();i.collapse(!0);let r=i.getBoundingClientRect();if(r.width!==0||r.height!==0)return{x:r.left,y:r.top,height:r.height||20}}catch{}let e=t.getBoundingClientRect();return{x:e.left+16,y:e.top+8,height:20}}};var f=class{static hostElement=null;static shadowRoot=null;static dismissTimer=null;static onUndoCallback=null;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-chip-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let t=document.createElement("style");t.textContent=`
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .snippo-chip {
        position: fixed;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        background: rgba(28, 28, 30, 0.88);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        color: #FFFFFF;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.2;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(6px) scale(0.96);
        transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
        white-space: nowrap;
      }
      .snippo-chip.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .chip-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(109, 99, 230, 0.28);
        color: #3DDC97;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.2px;
      }
      .chip-text {
        color: rgba(255, 255, 255, 0.9);
      }
      .chip-undo-btn {
        background: rgba(255, 255, 255, 0.14);
        border: none;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 9999px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transition: background 120ms ease, transform 80ms ease;
      }
      .chip-undo-btn:hover {
        background: rgba(255, 255, 255, 0.24);
      }
      .chip-undo-btn:active {
        transform: scale(0.95);
      }
      .chip-kbd {
        font-size: 9px;
        opacity: 0.6;
        text-transform: uppercase;
      }
    `,this.shadowRoot.appendChild(t),document.body.appendChild(this.hostElement)}static show(t,n,e,i=1800){if(this.ensureContainer(),!this.shadowRoot)return;this.dismissTimer&&(clearTimeout(this.dismissTimer),this.dismissTimer=null),this.onUndoCallback=e;let r=this.shadowRoot.querySelector(".snippo-chip");r&&r.remove();let s=document.createElement("div");s.className="snippo-chip";let a=window.innerHeight-56,o=window.innerWidth-220;n&&n.x>0&&n.y>0&&(a=Math.max(16,n.y-34),o=Math.min(window.innerWidth-200,Math.max(16,n.x))),s.style.top=`${a}px`,s.style.left=`${o}px`,s.innerHTML=`
      <span class="chip-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </span>
      <span class="chip-text">${this.escapeHtml(t)}</span>
      <button class="chip-undo-btn" id="snippo-undo-action">
        Undo <span class="chip-kbd">Esc</span>
      </button>
    `,s.querySelector("#snippo-undo-action")?.addEventListener("click",c=>{c.stopPropagation(),c.preventDefault(),this.triggerUndo()}),this.shadowRoot.appendChild(s),requestAnimationFrame(()=>{s.classList.add("visible")}),this.dismissTimer=setTimeout(()=>{this.dismiss()},i)}static triggerUndo(){if(this.onUndoCallback){let t=this.onUndoCallback;this.onUndoCallback=null,t()}this.dismiss()}static dismiss(){if(this.dismissTimer&&(clearTimeout(this.dismissTimer),this.dismissTimer=null),!this.shadowRoot)return;let t=this.shadowRoot.querySelector(".snippo-chip");t&&(t.classList.remove("visible"),setTimeout(()=>{t.remove()},200))}static escapeHtml(t){return t.replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[n])}};var b=class{static getDeepActiveElement(){let t=document.activeElement;for(;t&&t.shadowRoot&&t.shadowRoot.activeElement;)t=t.shadowRoot.activeElement;return t}};var E=class{static isSkipListElement(t){if(!t)return!0;if(t instanceof HTMLInputElement){let n=(t.type||"").toLowerCase();if(n==="password"||n==="hidden"||n==="file")return!0;let e=(t.autocomplete||"").toLowerCase();if(e.includes("cc-")||e.includes("credit-card")||e.includes("cvc")||e.includes("current-password")||e.includes("new-password")||e.includes("one-time-code"))return!0}return!!(t.getAttribute("data-snippo-ignore")==="true"||t.getAttribute("data-verbatim-ignore")==="true"||t.getAttribute("data-1p-ignore")==="true"||t.readOnly||t.disabled)}static detectCurrentEditor(){let t=b.getDeepActiveElement();if(!t||this.isSkipListElement(t))return{element:null,type:"unsupported"};if(document.location.hostname.includes("docs.google.com")&&(t.classList.contains("kix-canvas-tile-content")||t.classList.contains("docs-texteventtarget-iframe")))return{element:t,type:"fallback"};if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement)return{element:t,type:"plain-input"};if(t.isContentEditable||t.getAttribute("contenteditable")==="true")return{element:t,type:"rich-editable"};let n=t.closest?.('[contenteditable="true"]');if(n)return{element:n,type:"rich-editable"};try{let e=window.getSelection();if(e&&e.anchorNode){let i=e.anchorNode.nodeType===Node.ELEMENT_NODE?e.anchorNode:e.anchorNode.parentElement,r=i?.isContentEditable?i:i?.closest?.('[contenteditable="true"]');if(r&&!this.isSkipListElement(r))return{element:r,type:"rich-editable"}}}catch{}return{element:null,type:"unsupported"}}};var h=class{static lastContext=null;static targetElementRef=null;static undoTimeout=null;static record(t,n){this.undoTimeout&&clearTimeout(this.undoTimeout),this.lastContext=t,this.targetElementRef=new WeakRef(n),this.undoTimeout=setTimeout(()=>{this.clear()},6e3)}static canUndo(){return!!(this.lastContext&&this.targetElementRef?.deref())}static undo(){if(!this.lastContext||!this.targetElementRef)return!1;let t=this.targetElementRef.deref();if(!t)return this.clear(),!1;try{return this.lastContext.editorType==="plain-input"?p.undo(t,this.lastContext):this.lastContext.editorType==="rich-editable"&&g.undo(t,this.lastContext),this.clear(),!0}catch{return this.clear(),!1}}static clear(){this.undoTimeout&&(clearTimeout(this.undoTimeout),this.undoTimeout=null),this.lastContext=null,this.targetElementRef=null}};var y=class{matcher=new x;settings=null;isExcluded=!1;isInitialized=!1;isExpanding=!1;lastExpandedAt=0;async init(){try{if(this.isInitialized||(this.isInitialized=!0,typeof chrome>"u"||!chrome.runtime?.id))return;await this.syncState(),this.attachListeners(),this.listenForBroadcasts()}catch{}}async syncState(){if(chrome.runtime?.id)try{let t=await this.sendMessagePromise("GET_SETTINGS");if(t?.data){this.settings=t.data;let e=window.location.hostname.toLowerCase();this.isExcluded=(this.settings?.excludedDomains||[]).some(i=>e===i.toLowerCase()||e.endsWith("."+i.toLowerCase()))}if(this.isExcluded)return;let n=await this.sendMessagePromise("GET_TRIGGER_INDEX");n?.data&&this.matcher.updateIndex(n.data)}catch{}}attachListeners(){document.addEventListener("keydown",this.handleKeyDown,!0),document.addEventListener("input",this.handleInput,!0)}listenForBroadcasts(){typeof chrome>"u"||!chrome.runtime?.onMessage||chrome.runtime.onMessage.addListener(t=>((t?.type==="SNIPPETS_UPDATED"||t?.type==="SETTINGS_UPDATED")&&this.syncState(),!1))}handleKeyDown=t=>{if(t.key==="Escape"&&h.canUndo()){t.stopPropagation(),t.preventDefault(),h.undo(),f.dismiss();return}};handleInput=async t=>{if(this.isExcluded||this.isExpanding||Date.now()-this.lastExpandedAt<400||typeof chrome>"u"||!chrome.runtime?.id||t.isComposing)return;let{element:n,type:e}=E.detectCurrentEditor();if(!n||e==="unsupported")return;let i="";if(e==="plain-input"?i=p.getTail(n):e==="rich-editable"&&(i=g.getTail(n)),!i)return;let r=this.matcher.matchTail(i);if(r){this.isExpanding=!0;try{let s=await this.sendMessagePromise("EXPAND_TRIGGER",{snippetId:r.snippetId});if(!s?.data)return;let a=s.data,o=T.resolve(a.body),l=null,c=null;if(e==="plain-input"){let u=n;l=p.replaceTrigger(u,r.tailLength,o,a.id,r.matchedTrigger),c=p.getCaretCoordinates(u)}else e==="rich-editable"&&(l=g.replaceTrigger(n,r.tailLength,o,a.id,r.matchedTrigger),c=g.getCaretCoordinates(n));l&&(this.lastExpandedAt=Date.now(),h.record(l,n),this.settings?.showChip!==!1&&f.show(a.trigger,c,()=>h.undo(),this.settings?.chipDurationMs||1800))}catch{}finally{setTimeout(()=>{this.isExpanding=!1},150)}}};sendMessagePromise(t,n){return new Promise(e=>{try{chrome.runtime.sendMessage({type:t,payload:n},i=>{chrome.runtime.lastError?e({success:!1}):e(i)})}catch{e({success:!1})}})}},C=new y;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>C.init(),{once:!0}):C.init();})();
