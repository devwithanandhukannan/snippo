"use strict";(()=>{var R=class{maxTriggerLength=32;minTriggerLength=1;triggerMap=new Map;constructor(e){e&&this.updateIndex(e)}updateIndex(e){this.triggerMap.clear();let t=1,i=1e3;for(let[n,s]of Object.entries(e))s.enabled&&(this.triggerMap.set(n,s.id),n.length>t&&(t=n.length),n.length<i&&(i=n.length));this.maxTriggerLength=t,this.minTriggerLength=i===1e3?1:i}matchTail(e){if(!e||this.triggerMap.size===0)return null;let t=e.length,i=Math.min(t,this.maxTriggerLength);for(let n=i;n>=this.minTriggerLength;n--){let s=e.slice(t-n),a=this.triggerMap.get(s);if(a)return{matchedTrigger:s,snippetId:a,tailLength:n}}return null}couldTriggerEnd(e,t){return!!e}getTriggerCount(){return this.triggerMap.size}hasTrigger(e){return this.triggerMap.has(e)}};var w=class{static BUILT_IN_VARS=new Set(["date","date:short","date:iso","time","time:24","day","month","year","clipboard","cursor"]);static getFillInVariables(e){if(!e)return[];let t=e.matchAll(/\{\{?([a-zA-Z0-9_:\s\-]+)\}?\}/g),i=new Set,n=[];for(let s of t){let a=s[1].trim(),o=a.toLowerCase();if(this.BUILT_IN_VARS.has(o))continue;let l=a;o.startsWith("fill:")&&(l=a.slice(5).trim()),l&&!i.has(l.toLowerCase())&&(i.add(l.toLowerCase()),n.push(l))}return n}static resolve(e,t={}){if(!e)return{text:""};let i=t.now||new Date,n=t.fillValues||{},s,a=e.replace(/\{\{?([a-zA-Z0-9_:\s\-]+)\}?\}/g,(d,r)=>{let c=r.trim(),p=c.toLowerCase(),f=c;p.startsWith("fill:")&&(f=c.slice(5).trim());let u=Object.keys(n).find(h=>h.toLowerCase()===f.toLowerCase()||h.toLowerCase()===c.toLowerCase());if(u&&n[u]!==void 0)return n[u];switch(p){case"date":return i.toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"});case"date:iso":return i.toISOString().split("T")[0];case"date:short":return i.toLocaleDateString(void 0,{year:"numeric",month:"2-digit",day:"2-digit"});case"time":return i.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"});case"time:24":return i.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1});case"day":return i.toLocaleDateString(void 0,{weekday:"long"});case"year":return i.getFullYear().toString();case"month":return i.toLocaleDateString(void 0,{month:"long"});case"clipboard":return t.clipboardText??"";case"cursor":return"__VERBATIM_CURSOR__";default:return d}}),o="__VERBATIM_CURSOR__",l=a.indexOf(o);return l!==-1&&(s=l,a=a.replace(o,"")),{text:a,cursorOffset:s}}static getAvailableVariables(){let e=new Date;return[{tag:"{date}",label:"Date",preview:e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})},{tag:"{date:short}",label:"Short Date",preview:e.toLocaleDateString(void 0,{year:"numeric",month:"2-digit",day:"2-digit"})},{tag:"{date:iso}",label:"ISO Date",preview:e.toISOString().split("T")[0]},{tag:"{time}",label:"Time",preview:e.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"})},{tag:"{time:24}",label:"24h Time",preview:e.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1})},{tag:"{day}",label:"Day",preview:e.toLocaleDateString(void 0,{weekday:"long"})},{tag:"{month}",label:"Month",preview:e.toLocaleDateString(void 0,{month:"long"})},{tag:"{year}",label:"Year",preview:e.getFullYear().toString()}]}};var b=class{static isRestrictedInput(e){if(typeof HTMLInputElement>"u"||!(e instanceof HTMLInputElement))return!1;let t=(e.type||"").toLowerCase();return["email","number","date","datetime-local","time","month","week","color","range"].includes(t)}static getSelectionEndSafe(e){if(!this.isRestrictedInput(e))try{let t=e.selectionEnd;if(typeof t=="number")return t}catch{}try{return(e.value||"").length}catch{return 0}}static getTail(e,t=32){try{let i=e.value||"",n=this.getSelectionEndSafe(e),s=Math.min(Math.max(0,n),i.length),a=Math.max(0,s-t);return i.slice(a,s)}catch{return""}}static insertTextDirectly(e,t){if(typeof document<"u"&&document.activeElement!==e)try{e.focus()}catch{}let i=this.isRestrictedInput(e),n=!1;if(!i)try{n=document.execCommand("insertText",!1,t)}catch{n=!1}if(!n){let s=this.getSelectionEndSafe(e),a=s;if(!i&&typeof e.setRangeText=="function")try{e.setRangeText(t,a,s,"end"),n=!0}catch{}n||(e.value=e.value.slice(0,a)+t+e.value.slice(s),n=!0);try{e.dispatchEvent(new Event("input",{bubbles:!0}))}catch{}}return n}static replaceTrigger(e,t,i,n,s){let a=this.isRestrictedInput(e),o=this.getSelectionEndSafe(e),l=Math.max(0,o-t),d=e.value||"",r=i.text;if(typeof document<"u"&&document.activeElement!==e)try{e.focus()}catch{}let c=!1;if(!a)try{typeof document<"u"&&typeof e.setSelectionRange=="function"&&typeof document.execCommand=="function"&&(e.setSelectionRange(l,o),c=document.execCommand("insertText",!1,r))}catch{c=!1}if(!c||e.value===d){let p=!1;if(!a&&typeof e.setRangeText=="function")try{e.setRangeText(r,l,o,"end"),p=!0}catch{p=!1}p||(e.value=e.value.slice(0,l)+r+e.value.slice(o));let u=(typeof HTMLTextAreaElement<"u"?e instanceof HTMLTextAreaElement:e?.tagName?.toUpperCase()==="TEXTAREA")?typeof HTMLTextAreaElement<"u"?HTMLTextAreaElement.prototype:Object.getPrototypeOf(e):typeof HTMLInputElement<"u"?HTMLInputElement.prototype:Object.getPrototypeOf(e),h=u?Object.getOwnPropertyDescriptor(u,"value")?.set:void 0,T=e._valueTracker;if(T)try{T.setValue(d)}catch{}if(h)try{h.call(e,e.value)}catch{}let v=i.cursorOffset!==void 0?l+i.cursorOffset:l+r.length;if(!a&&typeof e.setSelectionRange=="function")try{e.setSelectionRange(v,v)}catch{}try{if(typeof InputEvent<"u"){let E=new InputEvent("input",{bubbles:!0,cancelable:!0,inputType:"insertReplacementText",data:r});e.dispatchEvent(E)}else typeof Event<"u"&&e.dispatchEvent(new Event("input",{bubbles:!0}))}catch{try{e.dispatchEvent(new Event("input",{bubbles:!0}))}catch{}}try{typeof Event<"u"&&e.dispatchEvent(new Event("change",{bubbles:!0}))}catch{}}else if(!a&&i.cursorOffset!==void 0&&typeof e.setSelectionRange=="function"){let p=l+i.cursorOffset;try{e.setSelectionRange(p,p)}catch{}}return{id:"undo-"+Date.now(),snippetId:n,trigger:s,expandedText:r,timestamp:Date.now(),editorType:"plain-input",restoreData:{startOffset:l,endOffset:l+r.length,originalTriggerText:s}}}static undo(e,t){let{startOffset:i,endOffset:n,originalTriggerText:s}=t.restoreData,a=this.isRestrictedInput(e);try{if(typeof document<"u"&&document.activeElement!==e)try{e.focus()}catch{}let o=!1;if(!a)try{typeof document<"u"&&typeof document.execCommand=="function"&&(o=document.execCommand("undo"))}catch{o=!1}if(!o){let l=!1;if(!a&&typeof e.setRangeText=="function")try{e.setRangeText(s,i,n,"end"),l=!0}catch{l=!1}if(l||(e.value=e.value.slice(0,i)+s+e.value.slice(n)),!a&&typeof e.setSelectionRange=="function")try{e.setSelectionRange(i+s.length,i+s.length)}catch{}let r=(typeof HTMLTextAreaElement<"u"?e instanceof HTMLTextAreaElement:e?.tagName?.toUpperCase()==="TEXTAREA")?typeof HTMLTextAreaElement<"u"?HTMLTextAreaElement.prototype:Object.getPrototypeOf(e):typeof HTMLInputElement<"u"?HTMLInputElement.prototype:Object.getPrototypeOf(e),c=r?Object.getOwnPropertyDescriptor(r,"value")?.set:void 0,p=e._valueTracker;if(p)try{p.setValue(t.expandedText)}catch{}if(c)try{c.call(e,e.value)}catch{}try{typeof Event<"u"&&(e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})))}catch{}}}catch{}}static getCaretCoordinates(e){try{let t=e.getBoundingClientRect();return{x:t.left+16,y:t.top-8,height:24}}catch{return null}}};var x=class{static getTail(e,t=32){let i=window.getSelection();if(!i||i.rangeCount===0)return"";let n=i.getRangeAt(0);if(n.startContainer.nodeType===Node.TEXT_NODE&&n.startContainer.textContent){let s=n.startContainer.textContent.replace(/\u00A0/g," "),a=n.startOffset,o=s.slice(0,a).replace(/[\u200B\u200C\u200D\uFEFF]/g,""),l=o.slice(Math.max(0,o.length-t));if(l)return l}try{let s=n.cloneRange();s.selectNodeContents(e),s.setEnd(n.startContainer,n.startOffset);let a=s.toString().replace(/\u00A0/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,"");if(a)return a.slice(Math.max(0,a.length-t))}catch{}try{let s=(e.innerText||e.textContent||"").replace(/\r?\n$/,"").replace(/\u00A0/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,"");if(s)return s.slice(Math.max(0,s.length-t))}catch{}return""}static replaceTrigger(e,t,i,n,s){let a=window.getSelection();if(!a||a.rangeCount===0)return null;let o=a.getRangeAt(0).cloneRange(),l=i.text,d=!1;try{let r=null,c=0;if(o.endContainer.nodeType===Node.TEXT_NODE)r=o.endContainer,c=o.endOffset;else if(o.endContainer.nodeType===Node.ELEMENT_NODE){let p=o.endContainer,f=p.childNodes[o.endOffset-1]||p.childNodes[o.endOffset];if(f)if(f.nodeType===Node.TEXT_NODE)r=f,c=f.textContent?.length||0;else{let u=document.createTreeWalker(f,NodeFilter.SHOW_TEXT),h=null;for(;u.nextNode();)h=u.currentNode;h&&(r=h,c=h.textContent?.length||0)}}if(r&&r.textContent){let p=r.textContent.replace(/\u00A0/g," ");if(p.slice(0,c).replace(/[\u200B\u200C\u200D\uFEFF]/g,"").toLowerCase().endsWith(s.toLowerCase())){let h=t,T=c;for(let E=c-1;E>=0;E--){let y=p[E];if(!(y==="\u200B"||y==="\u200C"||y==="\u200D"||y==="\uFEFF")&&(h--,h===0)){T=E;break}}let v=document.createRange();v.setStart(r,T),v.setEnd(r,c),d=this.executeInsertion(e,v,l)}}}catch{d=!1}if(!d)try{let r=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),c=[],p=-1,f=o.endOffset;for(;r.nextNode();){let u=r.currentNode,h=u.textContent?.length||0;c.push({node:u,len:h}),u===o.endContainer&&(p=c.length-1)}if(p===-1&&c.length>0&&(p=c.length-1,f=c[p].len),p>=0){let u=t,h=p,T=f,v=null,E=0;for(;h>=0&&u>0;){let y=c[h],F=T;if(F>=u){v=y.node,E=F-u,u=0;break}else u-=F,h--,h>=0&&(T=c[h].len)}if(v&&u===0){let y=document.createRange();y.setStart(v,E),y.setEnd(c[p].node,f),d=this.executeInsertion(e,y,l)}}}catch{d=!1}if(!d)try{a.removeAllRanges(),a.addRange(o),a.collapse(o.endContainer,o.endOffset);for(let c=0;c<t;c++)a.modify?.("extend","backward","character");let r=a.toString().replace(/[\u200B\u200C\u200D\uFEFF]/g,"").replace(/\u00A0/g," ");if((r.toLowerCase().endsWith(s.toLowerCase())||r.length===t)&&a.rangeCount>0){let c=a.getRangeAt(0);d=this.executeInsertion(e,c,l)}}catch{d=!1}if(!d)return null;if(i.cursorOffset!==void 0)try{let r=window.getSelection();if(r&&r.rangeCount>0){let c=l.length-i.cursorOffset;for(let p=0;p<c;p++)r.modify?.("move","backward","character")}}catch{}return{id:"undo-"+Date.now(),snippetId:n,trigger:s,expandedText:l,timestamp:Date.now(),editorType:"rich-editable",restoreData:{startOffset:0,endOffset:l.length,originalTriggerText:s}}}static undo(e,t){try{if(document.execCommand("undo"))return}catch{}let i=window.getSelection();if(i)try{i.collapseToEnd();for(let n=0;n<t.expandedText.length;n++)i.modify?.("extend","backward","character");document.execCommand("insertText",!1,t.restoreData.originalTriggerText)}catch{}}static getCaretCoordinates(e){let t=window.getSelection();if(!t||t.rangeCount===0)return null;try{let n=t.getRangeAt(0).cloneRange();n.collapse(!0);let s=n.getBoundingClientRect();if(s.width!==0||s.height!==0)return{x:s.left,y:s.top,height:s.height||20}}catch{}let i=e.getBoundingClientRect();return{x:i.left+16,y:i.top+8,height:20}}static insertTextDirectly(e,t){if(document.activeElement!==e&&!e.contains(document.activeElement))try{e.focus()}catch{}let i=!1;try{i=document.execCommand("insertText",!1,t)}catch{i=!1}return i||(i=this.insertViaClipboard(e,t)),i}static insertViaClipboard(e,t){try{let i=new DataTransfer;i.setData("text/plain",t);try{let a=new InputEvent("beforeinput",{bubbles:!0,cancelable:!0,inputType:"insertFromPaste",data:t});e.dispatchEvent(a)}catch{}let n=new ClipboardEvent("paste",{clipboardData:i,bubbles:!0,cancelable:!0});return e.dispatchEvent(n)}catch{return!1}}static executeInsertion(e,t,i){let n=window.getSelection();if(!n)return!1;if(document.activeElement!==e&&!e.contains(document.activeElement))try{e.focus()}catch{}try{n.removeAllRanges(),n.addRange(t)}catch{return!1}try{document.dispatchEvent(new Event("selectionchange"))}catch{}let s=!1;try{document.execCommand("delete",!1),s=document.execCommand("insertText",!1,i)}catch{s=!1}if(!s)try{n.removeAllRanges(),n.addRange(t),s=document.execCommand("insertText",!1,i)}catch{s=!1}if(!s)try{n.removeAllRanges(),n.addRange(t),s=this.insertViaClipboard(e,i)}catch{s=!1}if(!s)try{t.deleteContents();let a=document.createTextNode(i);t.insertNode(a),t.setStartAfter(a),t.setEndAfter(a),n.removeAllRanges(),n.addRange(t),s=!0;try{e.dispatchEvent(new InputEvent("input",{bubbles:!0,cancelable:!0,inputType:"insertReplacementText",data:i}))}catch{e.dispatchEvent(new Event("input",{bubbles:!0}))}}catch{s=!1}return s}};var L=class{static hostElement=null;static shadowRoot=null;static dismissTimer=null;static onUndoCallback=null;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-chip-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
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
    `,this.shadowRoot.appendChild(e),document.body.appendChild(this.hostElement)}static show(e,t,i,n=1800){if(this.ensureContainer(),!this.shadowRoot)return;this.dismissTimer&&(clearTimeout(this.dismissTimer),this.dismissTimer=null),this.onUndoCallback=i;let s=this.shadowRoot.querySelector(".snippo-chip");s&&s.remove();let a=document.createElement("div");a.className="snippo-chip";let o=window.innerHeight-56,l=window.innerWidth-220;t&&t.x>0&&t.y>0&&(o=Math.max(16,t.y-34),l=Math.min(window.innerWidth-200,Math.max(16,t.x))),a.style.top=`${o}px`,a.style.left=`${l}px`,a.innerHTML=`
      <span class="chip-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </span>
      <span class="chip-text">${this.escapeHtml(e)}</span>
      <button class="chip-undo-btn" id="snippo-undo-action">
        Undo <span class="chip-kbd">Esc</span>
      </button>
    `,a.querySelector("#snippo-undo-action")?.addEventListener("click",r=>{r.stopPropagation(),r.preventDefault(),this.triggerUndo()}),this.shadowRoot.appendChild(a),requestAnimationFrame(()=>{a.classList.add("visible")}),this.dismissTimer=setTimeout(()=>{this.dismiss()},n)}static triggerUndo(){if(this.onUndoCallback){let e=this.onUndoCallback;this.onUndoCallback=null,e()}this.dismiss()}static dismiss(){if(this.dismissTimer&&(clearTimeout(this.dismissTimer),this.dismissTimer=null),!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".snippo-chip");e&&(e.classList.remove("visible"),setTimeout(()=>{e.remove()},200))}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var M=class{static getDeepActiveElement(){let e=document.activeElement;for(;e&&e.shadowRoot&&e.shadowRoot.activeElement;)e=e.shadowRoot.activeElement;return e}};var C=class{static isSkipListElement(e){if(!e)return!0;if(typeof HTMLInputElement<"u"&&e instanceof HTMLInputElement||e?.tagName?.toLowerCase()==="input"){let i=(e.type||"").toLowerCase();if(i==="password"||i==="hidden"||i==="file"||i==="checkbox"||i==="radio"||i==="button"||i==="submit"||i==="reset"||i==="image")return!0;let n=(e.autocomplete||"").toLowerCase();if(n.includes("cc-")||n.includes("credit-card")||n.includes("cvc")||n.includes("current-password")||n.includes("new-password")||n.includes("one-time-code"))return!0}return!!(e.getAttribute("data-snippo-ignore")==="true"||e.getAttribute("data-verbatim-ignore")==="true"||e.getAttribute("data-1p-ignore")==="true"||e.readOnly||e.disabled)}static detectCurrentEditor(e){let t=e;if(t&&!this.isSkipListElement(t)){if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement)return{element:t,type:"plain-input"};let s=t.closest?.('[contenteditable]:not([contenteditable="false"])')||t.closest?.('[contenteditable="true"]');if(s&&!this.isSkipListElement(s))return{element:s,type:"rich-editable"};if(t.isContentEditable||t.getAttribute("contenteditable")==="true"||t.getAttribute("contenteditable")==="")return{element:t,type:"rich-editable"}}let i=M.getDeepActiveElement();if(!i||this.isSkipListElement(i))return{element:null,type:"unsupported"};if(document.location.hostname.includes("docs.google.com")&&(i.classList.contains("kix-canvas-tile-content")||i.classList.contains("docs-texteventtarget-iframe")))return{element:i,type:"fallback"};if(i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement)return{element:i,type:"plain-input"};if(i.isContentEditable||i.getAttribute("contenteditable")==="true"||i.getAttribute("contenteditable")==="")return{element:i,type:"rich-editable"};let n=i.closest?.('[contenteditable]:not([contenteditable="false"])')||i.closest?.('[contenteditable="true"]');if(n)return{element:n,type:"rich-editable"};try{let s=window.getSelection();if(s&&s.anchorNode){let a=s.anchorNode.nodeType===Node.ELEMENT_NODE?s.anchorNode:s.anchorNode.parentElement,o=a?.isContentEditable?a:a?.closest?.('[contenteditable]:not([contenteditable="false"])')||a?.closest?.('[contenteditable="true"]');if(o&&!this.isSkipListElement(o))return{element:o,type:"rich-editable"}}}catch{}return{element:null,type:"unsupported"}}};var k=class{static hostElement=null;static shadowRoot=null;static onSubmitCallback=null;static onCancelCallback=null;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-fillin-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; display: flex; align-items: center; justify-content: center;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .fillin-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 150ms ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .fillin-dialog {
        background: #1C1C1E;
        color: #FFFFFF;
        width: 380px;
        max-width: 90vw;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: scaleUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes scaleUp {
        from { transform: scale(0.94) translateY(8px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      .fillin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .fillin-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fillin-badge {
        background: rgba(109, 99, 230, 0.28);
        color: #3DDC97;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .fillin-title {
        font-size: 14px;
        font-weight: 600;
        color: #F5F5F7;
        margin: 0;
      }
      .fillin-close {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
      }
      .fillin-close:hover {
        color: #FFFFFF;
        background: rgba(255, 255, 255, 0.1);
      }
      .fillin-fields {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .field-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field-label {
        font-size: 11px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.7);
        text-transform: capitalize;
      }
      .field-input {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: #FFFFFF;
        font-size: 13px;
        padding: 8px 12px;
        outline: none;
        transition: border-color 140ms ease, box-shadow 140ms ease;
      }
      .field-input:focus {
        border-color: #6D63E6;
        box-shadow: 0 0 0 3px rgba(109, 99, 230, 0.3);
      }
      .fillin-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      .btn-cancel {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.8);
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.16);
      }
      .btn-submit {
        background: #5B5BD6;
        border: none;
        color: #FFFFFF;
        padding: 6px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .btn-submit:hover {
        background: #6D63E6;
      }
      .kbd-hint {
        font-size: 10px;
        opacity: 0.6;
      }
    `,this.shadowRoot.appendChild(e),document.body.appendChild(this.hostElement)}static show(e,t,i,n,s){if(this.ensureContainer(),!this.shadowRoot)return;this.onSubmitCallback=n,this.onCancelCallback=s||null;let a=this.shadowRoot.querySelector(".fillin-backdrop");a&&a.remove();let o=document.createElement("div");o.className="fillin-backdrop";let l=t.map((r,c)=>`
        <div class="field-group">
          <label class="field-label" for="fillin-input-${c}">${this.escapeHtml(r)}</label>
          <input type="text" id="fillin-input-${c}" class="field-input" data-field="${this.escapeHtml(r)}" placeholder="Enter ${this.escapeHtml(r)}..." autocomplete="off">
        </div>
      `).join("");o.innerHTML=`
      <div class="fillin-dialog" role="dialog" aria-modal="true">
        <div class="fillin-header">
          <div class="fillin-title-group">
            <span class="fillin-badge">${this.escapeHtml(e.trigger)}</span>
            <h3 class="fillin-title">Fill in details</h3>
          </div>
          <button class="fillin-close" id="btn-fillin-close" title="Cancel (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="fillin-form" class="fillin-fields">
          ${l}
          <div class="fillin-actions">
            <button type="button" class="btn-cancel" id="btn-fillin-cancel">Cancel <span class="kbd-hint">Esc</span></button>
            <button type="submit" class="btn-submit" id="btn-fillin-submit">Insert <span class="kbd-hint">\u21B5</span></button>
          </div>
        </form>
      </div>
    `,o.addEventListener("click",r=>{r.target===o&&this.cancel()}),o.querySelector("#fillin-form")?.addEventListener("submit",r=>{r.preventDefault(),this.submit(o)}),o.querySelector("#btn-fillin-close")?.addEventListener("click",()=>this.cancel()),o.querySelector("#btn-fillin-cancel")?.addEventListener("click",()=>this.cancel()),o.addEventListener("keydown",r=>{r.key==="Escape"&&(r.stopPropagation(),r.preventDefault(),this.cancel())}),this.shadowRoot.appendChild(o),requestAnimationFrame(()=>{o.querySelector(".field-input")?.focus()})}static submit(e){let t={};if(e.querySelectorAll(".field-input").forEach(n=>{let s=n.getAttribute("data-field")||"";t[s]=n.value.trim()}),this.onSubmitCallback){let n=this.onSubmitCallback;this.onSubmitCallback=null,n(t)}this.dismiss()}static cancel(){if(this.onCancelCallback){let e=this.onCancelCallback;this.onCancelCallback=null,e()}this.dismiss()}static dismiss(){if(!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".fillin-backdrop");e&&e.remove(),this.hostElement&&document.body.contains(this.hostElement)&&(this.hostElement.remove(),this.hostElement=null,this.shadowRoot=null)}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var I=class{static hostElement=null;static shadowRoot=null;static allSnippets=[];static filteredSnippets=[];static activeIndex=0;static onSelectCallback=null;static isVisible=!1;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-launcher-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; display: flex; align-items: center; justify-content: center;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .launcher-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 14vh;
        animation: fadeIn 140ms ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .launcher-card {
        width: 560px;
        max-width: 92vw;
        background: #18181B;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
        color: #FFFFFF;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: slideDown 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideDown {
        from { transform: translateY(-16px) scale(0.97); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .search-header {
        display: flex;
        align-items: center;
        padding: 14px 18px;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
      }
      .search-icon {
        color: rgba(255, 255, 255, 0.5);
        display: flex;
        align-items: center;
      }
      .launcher-input {
        flex: 1;
        background: transparent;
        border: none;
        color: #FFFFFF;
        font-size: 16px;
        outline: none;
      }
      .launcher-input::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
      .launcher-badge {
        background: rgba(109, 99, 230, 0.25);
        color: #A79BF8;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .results-list {
        list-style: none;
        margin: 0;
        padding: 8px;
        max-height: 330px;
        overflow-y: auto;
      }
      .result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: background 80ms ease;
      }
      .result-item.active {
        background: rgba(91, 91, 214, 0.35);
        border: 1px solid rgba(109, 99, 230, 0.3);
      }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow: hidden;
      }
      .item-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .item-trigger {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        font-weight: 700;
        color: #3DDC97;
      }
      .item-desc {
        font-size: 13px;
        font-weight: 500;
        color: #F4F4F5;
      }
      .item-preview {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .item-folder {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 8px;
        border-radius: 5px;
      }
      .empty-notice {
        padding: 32px 16px;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
      }
      .launcher-footer {
        padding: 8px 18px;
        background: rgba(0, 0, 0, 0.25);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
      }
      .kbd {
        background: rgba(255, 255, 255, 0.12);
        padding: 2px 5px;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 10px;
      }
    `,this.shadowRoot.appendChild(e),document.body.appendChild(this.hostElement)}static show(e,t){if(this.ensureContainer(),!this.shadowRoot)return;this.allSnippets=e.filter(a=>a.enabled!==!1),this.filteredSnippets=[...this.allSnippets],this.activeIndex=0,this.onSelectCallback=t,this.isVisible=!0;let i=this.shadowRoot.querySelector(".launcher-backdrop");i&&i.remove();let n=document.createElement("div");n.className="launcher-backdrop",n.innerHTML=`
      <div class="launcher-card" role="dialog" aria-modal="true">
        <div class="search-header">
          <span class="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input type="text" class="launcher-input" id="launcher-search" placeholder="Type a snippet or trigger..." autocomplete="off">
          <span class="launcher-badge">Quick Launcher</span>
        </div>

        <ul class="results-list" id="launcher-results">
        </ul>

        <div class="launcher-footer">
          <span><span class="kbd">\u2191\u2193</span> Navigate</span>
          <span><span class="kbd">\u21B5</span> Insert into chat</span>
          <span><span class="kbd">Esc</span> Close</span>
        </div>
      </div>
    `,n.addEventListener("click",a=>{a.target===n&&this.dismiss()});let s=n.querySelector("#launcher-search");s?.addEventListener("input",()=>{let a=s.value.toLowerCase().trim();a?this.filteredSnippets=this.allSnippets.filter(o=>o.trigger.toLowerCase().includes(a)||o.body.toLowerCase().includes(a)||o.description&&o.description.toLowerCase().includes(a)||o.folder&&o.folder.toLowerCase().includes(a)):this.filteredSnippets=[...this.allSnippets],this.activeIndex=0,this.renderResults(n)}),n.addEventListener("keydown",a=>{a.key==="ArrowDown"?(a.stopPropagation(),a.preventDefault(),this.filteredSnippets.length>0&&(this.activeIndex=(this.activeIndex+1)%this.filteredSnippets.length,this.updateActiveItem(n))):a.key==="ArrowUp"?(a.stopPropagation(),a.preventDefault(),this.filteredSnippets.length>0&&(this.activeIndex=(this.activeIndex-1+this.filteredSnippets.length)%this.filteredSnippets.length,this.updateActiveItem(n))):a.key==="Enter"?(a.stopPropagation(),a.preventDefault(),this.filteredSnippets[this.activeIndex]&&this.select(this.filteredSnippets[this.activeIndex])):a.key==="Escape"&&(a.stopPropagation(),a.preventDefault(),this.dismiss())}),this.shadowRoot.appendChild(n),this.renderResults(n),requestAnimationFrame(()=>{s?.focus()})}static renderResults(e){let t=e.querySelector("#launcher-results");if(t){if(this.filteredSnippets.length===0){t.innerHTML='<div class="empty-notice">No matching snippets found.</div>';return}t.innerHTML=this.filteredSnippets.map((i,n)=>{let s=n===this.activeIndex,a=i.body.replace(/\n/g," ").slice(0,50);return`
        <li class="result-item ${s?"active":""}" data-index="${n}">
          <div class="item-main">
            <div class="item-title-row">
              <span class="item-trigger">${this.escapeHtml(i.trigger)}</span>
              ${i.description?`<span class="item-desc">${this.escapeHtml(i.description)}</span>`:""}
            </div>
            <span class="item-preview">${this.escapeHtml(a)}</span>
          </div>
          <div class="item-meta">
            <span class="item-folder">${this.escapeHtml(i.folder||"Snippet")}</span>
          </div>
        </li>
      `}).join(""),t.querySelectorAll(".result-item").forEach(i=>{i.addEventListener("click",n=>{n.stopPropagation();let s=Number(i.getAttribute("data-index")||"0");this.filteredSnippets[s]&&this.select(this.filteredSnippets[s])})})}}static updateActiveItem(e){e.querySelectorAll(".result-item").forEach((i,n)=>{n===this.activeIndex?(i.classList.add("active"),i.scrollIntoView({block:"nearest"})):i.classList.remove("active")})}static select(e){if(this.onSelectCallback){let t=this.onSelectCallback;this.onSelectCallback=null,t(e)}this.dismiss()}static dismiss(){if(this.isVisible=!1,!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".launcher-backdrop");e&&e.remove(),this.hostElement&&document.body.contains(this.hostElement)&&(this.hostElement.remove(),this.hostElement=null,this.shadowRoot=null)}static isOpen(){return this.isVisible}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var m=class{static hostElement=null;static shadowRoot=null;static activeIndex=0;static currentSnippets=[];static onSelectCallback=null;static isVisible=!1;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-palette-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483646; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .snippo-palette {
        position: fixed;
        width: 290px;
        background: rgba(24, 24, 27, 0.94);
        -webkit-backdrop-filter: blur(20px) saturate(190%);
        backdrop-filter: blur(20px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
        color: #FFFFFF;
        overflow: hidden;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(4px) scale(0.98);
        transition: opacity 120ms ease, transform 120ms ease;
        user-select: none;
      }
      .snippo-palette.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .palette-header {
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }
      .palette-list {
        list-style: none;
        margin: 0;
        padding: 4px;
        max-height: 220px;
        overflow-y: auto;
      }
      .palette-item {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 7px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 80ms ease;
      }
      .palette-item.active {
        background: rgba(91, 91, 214, 0.35);
        border: 1px solid rgba(109, 99, 230, 0.4);
      }
      .item-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .item-trigger {
        font-size: 12px;
        font-weight: 700;
        color: #3DDC97;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .item-folder {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .item-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.85);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .palette-footer {
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.2);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
      }
      .kbd {
        background: rgba(255, 255, 255, 0.12);
        padding: 1px 4px;
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.7);
      }
    `,this.shadowRoot.appendChild(e),document.body.appendChild(this.hostElement)}static show(e,t,i){if(!e||e.length===0){this.dismiss();return}if(this.ensureContainer(),!this.shadowRoot)return;this.currentSnippets=e.slice(0,5),this.activeIndex=0,this.onSelectCallback=i,this.isVisible=!0;let n=100,s=100;t&&t.x>0&&t.y>0&&(n=t.y+(t.height||20)+6,s=Math.min(window.innerWidth-310,Math.max(12,t.x-20)),n+220>window.innerHeight&&(n=Math.max(12,t.y-230)));let a=this.shadowRoot.querySelector(".snippo-palette");a||(a=document.createElement("div"),a.className="snippo-palette",this.shadowRoot.appendChild(a)),a.style.top=`${n}px`,a.style.left=`${s}px`,this.renderItems(a),requestAnimationFrame(()=>{a.classList.add("visible")})}static renderItems(e){let t=this.currentSnippets.map((i,n)=>{let s=n===this.activeIndex,a=i.description||i.body.replace(/\n/g," ").slice(0,45);return`
        <li class="palette-item ${s?"active":""}" data-index="${n}">
          <div class="item-top">
            <span class="item-trigger">${this.escapeHtml(i.trigger)}</span>
            <span class="item-folder">${this.escapeHtml(i.folder||"Snippet")}</span>
          </div>
          <span class="item-desc">${this.escapeHtml(a)}</span>
        </li>
      `}).join("");e.innerHTML=`
      <div class="palette-header">
        <span>Snippo Suggestions</span>
        <span>${this.currentSnippets.length} matches</span>
      </div>
      <ul class="palette-list">
        ${t}
      </ul>
      <div class="palette-footer">
        <span><span class="kbd">\u2191\u2193</span> Navigate</span>
        <span><span class="kbd">\u21B5</span> Select</span>
        <span><span class="kbd">Esc</span> Close</span>
      </div>
    `,e.querySelectorAll(".palette-item").forEach(i=>{i.addEventListener("click",n=>{n.stopPropagation(),n.preventDefault();let s=Number(i.getAttribute("data-index")||"0");this.select(s)})})}static handleKeyDown(e){return!this.isVisible||this.currentSnippets.length===0?!1:e.key==="ArrowDown"?(e.stopPropagation(),e.preventDefault(),this.activeIndex=(this.activeIndex+1)%this.currentSnippets.length,this.updateActiveItem(),!0):e.key==="ArrowUp"?(e.stopPropagation(),e.preventDefault(),this.activeIndex=(this.activeIndex-1+this.currentSnippets.length)%this.currentSnippets.length,this.updateActiveItem(),!0):e.key==="Enter"||e.key==="Tab"?(e.stopPropagation(),e.preventDefault(),this.select(this.activeIndex),!0):e.key==="Escape"?(e.stopPropagation(),e.preventDefault(),this.dismiss(),!0):!1}static updateActiveItem(){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll(".palette-item").forEach((t,i)=>{i===this.activeIndex?(t.classList.add("active"),t.scrollIntoView({block:"nearest"})):t.classList.remove("active")})}static select(e){let t=this.currentSnippets[e];if(t&&this.onSelectCallback){let i=this.onSelectCallback;this.onSelectCallback=null,i(t)}this.dismiss()}static dismiss(){if(this.isVisible=!1,this.currentSnippets=[],!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".snippo-palette");e&&(e.classList.remove("visible"),setTimeout(()=>{e.remove()},150))}static isOpen(){return this.isVisible}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var S=class{static lastContext=null;static targetElementRef=null;static undoTimeout=null;static record(e,t){this.undoTimeout&&clearTimeout(this.undoTimeout),this.lastContext=e,this.targetElementRef=new WeakRef(t),this.undoTimeout=setTimeout(()=>{this.clear()},6e3)}static canUndo(){return!!(this.lastContext&&this.targetElementRef?.deref())}static undo(){if(!this.lastContext||!this.targetElementRef)return!1;let e=this.targetElementRef.deref();if(!e)return this.clear(),!1;try{return this.lastContext.editorType==="plain-input"?b.undo(e,this.lastContext):this.lastContext.editorType==="rich-editable"&&x.undo(e,this.lastContext),this.clear(),!0}catch{return this.clear(),!1}}static clear(){this.undoTimeout&&(clearTimeout(this.undoTimeout),this.undoTimeout=null),this.lastContext=null,this.targetElementRef=null}};var H=class{matcher=new R;settings=null;allSnippets=[];isExcluded=!1;isInitialized=!1;isExpanding=!1;lastExpandedAt=0;lastActiveElement=null;async init(){try{if(this.isInitialized||(this.isInitialized=!0,typeof chrome>"u"||!chrome.runtime?.id))return;await this.syncState(),this.attachListeners(),this.listenForBroadcasts()}catch{}}async syncState(){if(chrome.runtime?.id)try{let e=await this.sendMessagePromise("GET_SETTINGS");if(e?.data){this.settings=e.data;let s=window.location.hostname.toLowerCase();this.isExcluded=(this.settings?.excludedDomains||[]).some(a=>s===a.toLowerCase()||s.endsWith("."+a.toLowerCase()))}if(this.isExcluded||this.settings?.enabled===!1){this.matcher.updateIndex({}),this.allSnippets=[];return}let[i,n]=await Promise.all([this.sendMessagePromise("GET_TRIGGER_INDEX"),this.sendMessagePromise("GET_ALL_SNIPPETS")]);i?.data&&this.matcher.updateIndex(i.data),n?.data&&(this.allSnippets=n.data)}catch{}}attachListeners(){document.addEventListener("keydown",this.handleKeyDown,!0),document.addEventListener("input",this.handleInput,!0),document.addEventListener("focusin",this.handleFocusIn,!0)}handleFocusIn=e=>{let t=e.target;t&&!C.isSkipListElement(t)&&(this.lastActiveElement=t)};listenForBroadcasts(){typeof chrome>"u"||(chrome.runtime?.onMessage&&chrome.runtime.onMessage.addListener(e=>(e?.type==="SNIPPETS_UPDATED"||e?.type==="SETTINGS_UPDATED"?this.syncState():e?.type==="OPEN_LAUNCHER"?this.openQuickLauncher():e?.type==="INSERT_SNIPPET"&&e.payload?.snippet&&this.insertSnippetFromExternal(e.payload.snippet),!1)),chrome.storage?.onChanged&&chrome.storage.onChanged.addListener((e,t)=>{t==="local"&&(e.verbatim_settings_v1||e.verbatim_trigger_index_v1)&&this.syncState()}))}handleKeyDown=e=>{if(!(this.isExcluded||this.settings?.enabled===!1)){if(e.altKey&&e.shiftKey&&(e.key==="K"||e.code==="KeyK"||e.key===" "||e.code==="Space")){e.stopPropagation(),e.preventDefault(),this.openQuickLauncher();return}if(!(m.isOpen()&&m.handleKeyDown(e))&&e.key==="Escape"&&e.isTrusted){if(m.isOpen()){m.dismiss();return}if(S.canUndo()){e.stopPropagation(),e.preventDefault(),S.undo(),L.dismiss();return}}}};handleInput=async e=>{if(this.isExcluded||this.settings?.enabled===!1||this.isExpanding||Date.now()-this.lastExpandedAt<400||typeof chrome>"u"||!chrome.runtime?.id||e.isComposing)return;let{element:t,type:i}=C.detectCurrentEditor(e.target);if(!t||i==="unsupported"){m.dismiss();return}this.lastActiveElement=t;let n="";try{i==="plain-input"?n=b.getTail(t):i==="rich-editable"&&(n=x.getTail(t))}catch{return}if(!n){m.dismiss();return}let s=this.matcher.matchTail(n);if(s){m.dismiss(),this.expandTrigger(s.snippetId,s.tailLength,s.matchedTrigger,t,i);return}this.checkInLinePalette(n,t,i)};checkInLinePalette(e,t,i){if(this.allSnippets.length===0){m.dismiss();return}let n=e.match(/(?:^|\s)([/;:!]|,,)([a-zA-Z0-9_\-]*)$/);if(!n){m.dismiss();return}let s=n[1]+n[2],a=n[1],o=n[2].toLowerCase(),l=this.allSnippets.filter(r=>{if(r.enabled===!1)return!1;let c=r.trigger.toLowerCase();return c.startsWith(s.toLowerCase())||c.replace(/^[/;:!]|,,/,"").startsWith(o)||r.description&&r.description.toLowerCase().includes(o)});if(l.length===0){m.dismiss();return}let d=null;i==="plain-input"?d=b.getCaretCoordinates(t):i==="rich-editable"&&(d=x.getCaretCoordinates(t)),m.show(l,d,r=>{this.expandTrigger(r.id,s.length,s,t,i)})}async expandTrigger(e,t,i,n,s){if(!this.isExpanding){this.isExpanding=!0;try{let a=await this.sendMessagePromise("EXPAND_TRIGGER",{snippetId:e});if(!a?.data)return;let o=a.data,l=w.getFillInVariables(o.body),d=null;s==="plain-input"?d=b.getCaretCoordinates(n):s==="rich-editable"&&(d=x.getCaretCoordinates(n)),l.length>0?k.show(o,l,d,r=>{this.executeExpansion(o,t,i,n,s,r)}):this.executeExpansion(o,t,i,n,s)}catch{}finally{this.lastExpandedAt=Date.now(),setTimeout(()=>{this.isExpanding=!1},150)}}}executeExpansion(e,t,i,n,s,a){let o=w.resolve(e.body,{fillValues:a}),l=null,d=null;if(s==="plain-input"){let r=n;l=b.replaceTrigger(r,t,o,e.id,i),d=b.getCaretCoordinates(r)}else s==="rich-editable"&&(l=x.replaceTrigger(n,t,o,e.id,i),d=x.getCaretCoordinates(n));l&&(S.record(l,n),this.settings?.showChip!==!1&&L.show(e.trigger,d,()=>S.undo(),this.settings?.chipDurationMs||1800))}openQuickLauncher(){let e=C.detectCurrentEditor();e.element&&(this.lastActiveElement=e.element),I.show(this.allSnippets,t=>{this.insertSnippetFromExternal(t)})}insertSnippetFromExternal(e){let t=this.lastActiveElement||C.detectCurrentEditor().element;if(!t)return;let i=w.getFillInVariables(e.body);if(i.length>0)k.show(e,i,null,n=>{let s=w.resolve(e.body,{fillValues:n});this.injectTextIntoElement(t,s.text)});else{let n=w.resolve(e.body);this.injectTextIntoElement(t,n.text)}}injectTextIntoElement(e,t){e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?b.insertTextDirectly(e,t):x.insertTextDirectly(e,t)}sendMessagePromise(e,t){return new Promise(i=>{try{chrome.runtime.sendMessage({type:e,payload:t},n=>{chrome.runtime.lastError?i({success:!1}):i(n)})}catch{i({success:!1})}})}},A=new H;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>A.init(),{once:!0}):A.init();})();
