"use strict";(()=>{var M=class{maxTriggerLength=32;minTriggerLength=1;triggerMap=new Map;constructor(e){e&&this.updateIndex(e)}updateIndex(e){this.triggerMap.clear();let t=1,i=1e3;for(let[n,s]of Object.entries(e))s.enabled&&(this.triggerMap.set(n,s.id),n.length>t&&(t=n.length),n.length<i&&(i=n.length));this.maxTriggerLength=t,this.minTriggerLength=i===1e3?1:i}matchTail(e){if(!e||this.triggerMap.size===0)return null;let t=e.length,i=Math.min(t,this.maxTriggerLength);for(let n=i;n>=this.minTriggerLength;n--){let s=e.slice(t-n),a=this.triggerMap.get(s);if(a)return{matchedTrigger:s,snippetId:a,tailLength:n}}return null}couldTriggerEnd(e,t){return!!e}getTriggerCount(){return this.triggerMap.size}hasTrigger(e){return this.triggerMap.has(e)}};var T=class{static BUILT_IN_VARS=new Set(["date","date:short","date:iso","time","time:24","day","month","year","clipboard","cursor"]);static getFillInVariables(e){if(!e)return[];let t=e.matchAll(/\{\{?([a-zA-Z0-9_:\s\-]+)\}?\}/g),i=new Set,n=[];for(let s of t){let a=s[1].trim(),o=a.toLowerCase();if(this.BUILT_IN_VARS.has(o))continue;let l=a;o.startsWith("fill:")&&(l=a.slice(5).trim()),l&&!i.has(l.toLowerCase())&&(i.add(l.toLowerCase()),n.push(l))}return n}static resolve(e,t={}){if(!e)return{text:""};let i=t.now||new Date,n=t.fillValues||{},s,a=e.replace(/\{\{?([a-zA-Z0-9_:\s\-]+)\}?\}/g,(d,r)=>{let c=r.trim(),p=c.toLowerCase(),f=c;p.startsWith("fill:")&&(f=c.slice(5).trim());let u=Object.keys(n).find(h=>h.toLowerCase()===f.toLowerCase()||h.toLowerCase()===c.toLowerCase());if(u&&n[u]!==void 0)return n[u];switch(p){case"date":return i.toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"});case"date:iso":return i.toISOString().split("T")[0];case"date:short":return i.toLocaleDateString(void 0,{year:"numeric",month:"2-digit",day:"2-digit"});case"time":return i.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"});case"time:24":return i.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1});case"day":return i.toLocaleDateString(void 0,{weekday:"long"});case"year":return i.getFullYear().toString();case"month":return i.toLocaleDateString(void 0,{month:"long"});case"clipboard":return t.clipboardText??"";case"cursor":return"__VERBATIM_CURSOR__";default:return d}}),o="__VERBATIM_CURSOR__",l=a.indexOf(o);return l!==-1&&(s=l,a=a.replace(o,"")),{text:a,cursorOffset:s}}static getAvailableVariables(){let e=new Date;return[{tag:"{date}",label:"Date",preview:e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})},{tag:"{date:short}",label:"Short Date",preview:e.toLocaleDateString(void 0,{year:"numeric",month:"2-digit",day:"2-digit"})},{tag:"{date:iso}",label:"ISO Date",preview:e.toISOString().split("T")[0]},{tag:"{time}",label:"Time",preview:e.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"})},{tag:"{time:24}",label:"24h Time",preview:e.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1})},{tag:"{day}",label:"Day",preview:e.toLocaleDateString(void 0,{weekday:"long"})},{tag:"{month}",label:"Month",preview:e.toLocaleDateString(void 0,{month:"long"})},{tag:"{year}",label:"Year",preview:e.getFullYear().toString()}]}};var N=1,F={triggerPrefix:"/",expandOn:"immediate",showChip:!0,chipDurationMs:1800,soundOnExpand:!1,excludedDomains:["bankofamerica.com","chase.com","wellsfargo.com"],theme:"system",confirmOnDelete:!0,enabled:!0,schemaVersion:N},I=[{id:"snip-omw",trigger:"/omw",body:"On my way!",description:"Quick message: On my way",folder:"General",enabled:!0,createdAt:Date.now(),updatedAt:Date.now(),usageCount:0},{id:"snip-email",trigger:"/email",body:"hello@saymore.local",description:"Personal email address",folder:"Personal",enabled:!0,createdAt:Date.now(),updatedAt:Date.now(),usageCount:0}];var v=class{static isRestrictedInput(e){if(typeof HTMLInputElement>"u"||!(e instanceof HTMLInputElement))return!1;let t=(e.type||"").toLowerCase();return["email","number","date","datetime-local","time","month","week","color","range"].includes(t)}static getSelectionEndSafe(e){if(!this.isRestrictedInput(e))try{let t=e.selectionEnd;if(typeof t=="number")return t}catch{}try{return(e.value||"").length}catch{return 0}}static getTail(e,t=32){try{let i=e.value||"",n=this.getSelectionEndSafe(e),s=Math.min(Math.max(0,n),i.length),a=Math.max(0,s-t);return i.slice(a,s)}catch{return""}}static insertTextDirectly(e,t){if(typeof document<"u"&&document.activeElement!==e)try{e.focus()}catch{}let i=this.isRestrictedInput(e),n=!1;if(!i)try{n=document.execCommand("insertText",!1,t)}catch{n=!1}if(!n){let s=this.getSelectionEndSafe(e),a=s;if(!i&&typeof e.setRangeText=="function")try{e.setRangeText(t,a,s,"end"),n=!0}catch{}n||(e.value=e.value.slice(0,a)+t+e.value.slice(s),n=!0);try{e.dispatchEvent(new Event("input",{bubbles:!0}))}catch{}}return n}static replaceTrigger(e,t,i,n,s){let a=this.isRestrictedInput(e),o=this.getSelectionEndSafe(e),l=Math.max(0,o-t),d=e.value||"",r=i.text;if(typeof document<"u"&&document.activeElement!==e)try{e.focus()}catch{}let c=!1;if(!a)try{typeof document<"u"&&typeof e.setSelectionRange=="function"&&typeof document.execCommand=="function"&&(e.setSelectionRange(l,o),c=document.execCommand("insertText",!1,r))}catch{c=!1}if(!c||e.value===d){let p=!1;if(!a&&typeof e.setRangeText=="function")try{e.setRangeText(r,l,o,"end"),p=!0}catch{p=!1}p||(e.value=e.value.slice(0,l)+r+e.value.slice(o));let u=(typeof HTMLTextAreaElement<"u"?e instanceof HTMLTextAreaElement:e?.tagName?.toUpperCase()==="TEXTAREA")?typeof HTMLTextAreaElement<"u"?HTMLTextAreaElement.prototype:Object.getPrototypeOf(e):typeof HTMLInputElement<"u"?HTMLInputElement.prototype:Object.getPrototypeOf(e),h=u?Object.getOwnPropertyDescriptor(u,"value")?.set:void 0,m=e._valueTracker;if(m)try{m.setValue(d)}catch{}if(h)try{h.call(e,e.value)}catch{}let x=i.cursorOffset!==void 0?l+i.cursorOffset:l+r.length;if(!a&&typeof e.setSelectionRange=="function")try{e.setSelectionRange(x,x)}catch{}try{if(typeof InputEvent<"u"){let E=new InputEvent("input",{bubbles:!0,cancelable:!0,inputType:"insertReplacementText",data:r});e.dispatchEvent(E)}else typeof Event<"u"&&e.dispatchEvent(new Event("input",{bubbles:!0}))}catch{try{e.dispatchEvent(new Event("input",{bubbles:!0}))}catch{}}try{typeof Event<"u"&&e.dispatchEvent(new Event("change",{bubbles:!0}))}catch{}}else if(!a&&i.cursorOffset!==void 0&&typeof e.setSelectionRange=="function"){let p=l+i.cursorOffset;try{e.setSelectionRange(p,p)}catch{}}return{id:"undo-"+Date.now(),snippetId:n,trigger:s,expandedText:r,timestamp:Date.now(),editorType:"plain-input",restoreData:{startOffset:l,endOffset:l+r.length,originalTriggerText:s}}}static undo(e,t){let{startOffset:i,endOffset:n,originalTriggerText:s}=t.restoreData,a=this.isRestrictedInput(e);try{if(typeof document<"u"&&document.activeElement!==e)try{e.focus()}catch{}let o=!1;if(!a)try{typeof document<"u"&&typeof document.execCommand=="function"&&(o=document.execCommand("undo"))}catch{o=!1}if(!o){let l=!1;if(!a&&typeof e.setRangeText=="function")try{e.setRangeText(s,i,n,"end"),l=!0}catch{l=!1}if(l||(e.value=e.value.slice(0,i)+s+e.value.slice(n)),!a&&typeof e.setSelectionRange=="function")try{e.setSelectionRange(i+s.length,i+s.length)}catch{}let r=(typeof HTMLTextAreaElement<"u"?e instanceof HTMLTextAreaElement:e?.tagName?.toUpperCase()==="TEXTAREA")?typeof HTMLTextAreaElement<"u"?HTMLTextAreaElement.prototype:Object.getPrototypeOf(e):typeof HTMLInputElement<"u"?HTMLInputElement.prototype:Object.getPrototypeOf(e),c=r?Object.getOwnPropertyDescriptor(r,"value")?.set:void 0,p=e._valueTracker;if(p)try{p.setValue(t.expandedText)}catch{}if(c)try{c.call(e,e.value)}catch{}try{typeof Event<"u"&&(e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})))}catch{}}}catch{}}static getCaretCoordinates(e){try{if(typeof e.getBoundingClientRect!="function")return null;let t=e.getBoundingClientRect(),i=typeof window<"u"&&typeof window.getComputedStyle=="function"?window.getComputedStyle(e):null,n=i&&parseFloat(i.paddingLeft)||12,s=t.left+n;try{let o=e.value||"",l=this.getSelectionEndSafe(e),d=o.slice(0,Math.min(l,o.length));if(typeof document<"u"&&typeof document.createElement=="function"){let r=document.createElement("canvas"),c=r.getContext?r.getContext("2d"):null;if(c&&i){c.font=`${i.fontWeight||"400"} ${i.fontSize||"14px"} ${i.fontFamily||"sans-serif"}`;let p=c.measureText(d).width,f=e.scrollLeft||0;s=t.left+n+p-f}}}catch{}return{x:Math.min(Math.max(t.left+n,s),t.right?t.right-10:s),y:t.top,height:t.height||24}}catch{return null}}};var y=class{static getTail(e,t=32){let i=window.getSelection();if(!i||i.rangeCount===0)return"";let n=i.getRangeAt(0);if(n.startContainer.nodeType===Node.TEXT_NODE&&n.startContainer.textContent){let s=n.startContainer.textContent.replace(/\u00A0/g," "),a=n.startOffset,o=s.slice(0,a).replace(/[\u200B\u200C\u200D\uFEFF]/g,""),l=o.slice(Math.max(0,o.length-t));if(l)return l}try{let s=n.cloneRange();s.selectNodeContents(e),s.setEnd(n.startContainer,n.startOffset);let a=s.toString().replace(/\u00A0/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,"");if(a)return a.slice(Math.max(0,a.length-t))}catch{}try{let s=(e.innerText||e.textContent||"").replace(/\r?\n$/,"").replace(/\u00A0/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,"");if(s)return s.slice(Math.max(0,s.length-t))}catch{}return""}static replaceTrigger(e,t,i,n,s){let a=window.getSelection();if(!a||a.rangeCount===0)return null;let o=a.getRangeAt(0).cloneRange(),l=i.text,d=!1;try{let r=null,c=0;if(o.endContainer.nodeType===Node.TEXT_NODE)r=o.endContainer,c=o.endOffset;else if(o.endContainer.nodeType===Node.ELEMENT_NODE){let p=o.endContainer,f=p.childNodes[o.endOffset-1]||p.childNodes[o.endOffset];if(f)if(f.nodeType===Node.TEXT_NODE)r=f,c=f.textContent?.length||0;else{let u=document.createTreeWalker(f,NodeFilter.SHOW_TEXT),h=null;for(;u.nextNode();)h=u.currentNode;h&&(r=h,c=h.textContent?.length||0)}}if(r&&r.textContent){let p=r.textContent.replace(/\u00A0/g," ");if(p.slice(0,c).replace(/[\u200B\u200C\u200D\uFEFF]/g,"").toLowerCase().endsWith(s.toLowerCase())){let h=t,m=c;for(let E=c-1;E>=0;E--){let w=p[E];if(!(w==="\u200B"||w==="\u200C"||w==="\u200D"||w==="\uFEFF")&&(h--,h===0)){m=E;break}}let x=document.createRange();x.setStart(r,m),x.setEnd(r,c),d=this.executeInsertion(e,x,l)}}}catch{d=!1}if(!d)try{let r=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),c=[],p=-1,f=o.endOffset;for(;r.nextNode();){let u=r.currentNode,h=u.textContent?.length||0;c.push({node:u,len:h}),u===o.endContainer&&(p=c.length-1)}if(p===-1&&c.length>0&&(p=c.length-1,f=c[p].len),p>=0){let u=t,h=p,m=f,x=null,E=0;for(;h>=0&&u>0;){let w=c[h],H=m;if(H>=u){x=w.node,E=H-u,u=0;break}else u-=H,h--,h>=0&&(m=c[h].len)}if(x&&u===0){let w=document.createRange();w.setStart(x,E),w.setEnd(c[p].node,f),d=this.executeInsertion(e,w,l)}}}catch{d=!1}if(!d)try{a.removeAllRanges(),a.addRange(o),a.collapse(o.endContainer,o.endOffset);for(let c=0;c<t;c++)a.modify?.("extend","backward","character");let r=a.toString().replace(/[\u200B\u200C\u200D\uFEFF]/g,"").replace(/\u00A0/g," ");if((r.toLowerCase().endsWith(s.toLowerCase())||r.length===t)&&a.rangeCount>0){let c=a.getRangeAt(0);d=this.executeInsertion(e,c,l)}}catch{d=!1}if(!d)return null;if(i.cursorOffset!==void 0)try{let r=window.getSelection();if(r&&r.rangeCount>0){let c=l.length-i.cursorOffset;for(let p=0;p<c;p++)r.modify?.("move","backward","character")}}catch{}return{id:"undo-"+Date.now(),snippetId:n,trigger:s,expandedText:l,timestamp:Date.now(),editorType:"rich-editable",restoreData:{startOffset:0,endOffset:l.length,originalTriggerText:s}}}static undo(e,t){try{if(document.execCommand("undo"))return}catch{}let i=window.getSelection();if(i)try{i.collapseToEnd();for(let n=0;n<t.expandedText.length;n++)i.modify?.("extend","backward","character");document.execCommand("insertText",!1,t.restoreData.originalTriggerText)}catch{}}static getCaretCoordinates(e){let t=window.getSelection();if(!t||t.rangeCount===0)return null;try{let n=t.getRangeAt(0).cloneRange();n.collapse(!0);let s=n.getBoundingClientRect();if(s.width!==0||s.height!==0)return{x:s.left,y:s.top,height:s.height||20}}catch{}let i=e.getBoundingClientRect();return{x:i.left+16,y:i.top+8,height:20}}static insertTextDirectly(e,t){if(document.activeElement!==e&&!e.contains(document.activeElement))try{e.focus()}catch{}let i=!1;try{i=document.execCommand("insertText",!1,t)}catch{i=!1}return i||(i=this.insertViaClipboard(e,t)),i}static insertViaClipboard(e,t){try{let i=new DataTransfer;i.setData("text/plain",t);try{let a=new InputEvent("beforeinput",{bubbles:!0,cancelable:!0,inputType:"insertFromPaste",data:t});e.dispatchEvent(a)}catch{}let n=new ClipboardEvent("paste",{clipboardData:i,bubbles:!0,cancelable:!0});return e.dispatchEvent(n)}catch{return!1}}static executeInsertion(e,t,i){let n=window.getSelection();if(!n)return!1;if(document.activeElement!==e&&!e.contains(document.activeElement))try{e.focus()}catch{}try{n.removeAllRanges(),n.addRange(t)}catch{return!1}try{document.dispatchEvent(new Event("selectionchange"))}catch{}let s=!1;try{document.execCommand("delete",!1),s=document.execCommand("insertText",!1,i)}catch{s=!1}if(!s)try{n.removeAllRanges(),n.addRange(t),s=document.execCommand("insertText",!1,i)}catch{s=!1}if(!s)try{n.removeAllRanges(),n.addRange(t),s=this.insertViaClipboard(e,i)}catch{s=!1}if(!s)try{t.deleteContents();let a=document.createTextNode(i);t.insertNode(a),t.setStartAfter(a),t.setEndAfter(a),n.removeAllRanges(),n.addRange(t),s=!0;try{e.dispatchEvent(new InputEvent("input",{bubbles:!0,cancelable:!0,inputType:"insertReplacementText",data:i}))}catch{e.dispatchEvent(new Event("input",{bubbles:!0}))}}catch{s=!1}return s}};var L=class{static hostElement=null;static shadowRoot=null;static dismissTimer=null;static onUndoCallback=null;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-chip-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
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
      .snippo-chip.visible:hover {
        opacity: 0.35;
      }
      .snippo-chip.visible:hover .chip-undo-btn,
      .snippo-chip.visible .chip-undo-btn:hover {
        opacity: 1;
      }
      .chip-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(24, 114, 222, 0.24);
        color: #3296FD;
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
    `,this.shadowRoot.appendChild(e),document.body.appendChild(this.hostElement)}static show(e,t,i,n=1800,s){if(this.ensureContainer(),!this.shadowRoot)return;this.dismissTimer&&(clearTimeout(this.dismissTimer),this.dismissTimer=null),this.onUndoCallback=i;let a=this.shadowRoot.querySelector(".snippo-chip");a&&a.remove();let o=document.createElement("div");o.className="snippo-chip";let l=28,d=8,r=window.innerHeight-56,c=window.innerWidth-220,p=s&&typeof s.getBoundingClientRect=="function"?s.getBoundingClientRect():null;if(p&&p.width>0&&p.height>0){let u=p.top>=l+d+6,h=window.innerHeight-p.bottom>=l+d+6;u?r=p.top-l-d:h?r=p.bottom+d:r=window.innerHeight-56,t&&t.x>0?c=Math.min(window.innerWidth-220,Math.max(12,t.x-20)):c=Math.min(window.innerWidth-220,Math.max(12,p.left+16));let m=r;!(r+l<p.top||m>p.bottom)&&(h?r=p.bottom+d:u?r=p.top-l-d:(r=window.innerHeight-56,c=window.innerWidth-220))}else if(t&&t.x>0&&t.y>0){let u=t.height||24,h=t.y,m=t.y+u;h>=l+d+6?r=h-l-d:window.innerHeight-m>=l+d+6?r=m+d:r=window.innerHeight-56,c=Math.min(window.innerWidth-220,Math.max(12,t.x-20))}o.style.top=`${r}px`,o.style.left=`${c}px`,o.innerHTML=`
      <span class="chip-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </span>
      <span class="chip-text">${this.escapeHtml(e)}</span>
      <button class="chip-undo-btn" id="snippo-undo-action">
        Undo <span class="chip-kbd">Esc</span>
      </button>
    `,o.querySelector("#snippo-undo-action")?.addEventListener("click",u=>{u.stopPropagation(),u.preventDefault(),this.triggerUndo()}),this.shadowRoot.appendChild(o),requestAnimationFrame(()=>{o.classList.add("visible")}),this.dismissTimer=setTimeout(()=>{this.dismiss()},n)}static triggerUndo(){if(this.onUndoCallback){let e=this.onUndoCallback;this.onUndoCallback=null,e()}this.dismiss()}static dismiss(){if(this.dismissTimer&&(clearTimeout(this.dismissTimer),this.dismissTimer=null),!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".snippo-chip");e&&(e.classList.remove("visible"),setTimeout(()=>{e.remove()},200))}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var R=class{static getDeepActiveElement(){let e=document.activeElement;for(;e&&e.shadowRoot&&e.shadowRoot.activeElement;)e=e.shadowRoot.activeElement;return e}};var C=class{static isSkipListElement(e){if(!e)return!0;if(typeof HTMLInputElement<"u"&&e instanceof HTMLInputElement||e?.tagName?.toLowerCase()==="input"){let i=(e.type||"").toLowerCase();if(i==="password"||i==="hidden"||i==="file"||i==="checkbox"||i==="radio"||i==="button"||i==="submit"||i==="reset"||i==="image")return!0;let n=(e.autocomplete||"").toLowerCase();if(n.includes("cc-")||n.includes("credit-card")||n.includes("cvc")||n.includes("current-password")||n.includes("new-password")||n.includes("one-time-code"))return!0}return!!(e.getAttribute("data-snippo-ignore")==="true"||e.getAttribute("data-verbatim-ignore")==="true"||e.getAttribute("data-1p-ignore")==="true"||e.readOnly||e.disabled)}static detectCurrentEditor(e){let t=e;if(t&&!this.isSkipListElement(t)){let d=typeof HTMLInputElement<"u"&&t instanceof HTMLInputElement||t.tagName?.toLowerCase()==="input",r=typeof HTMLTextAreaElement<"u"&&t instanceof HTMLTextAreaElement||t.tagName?.toLowerCase()==="textarea";if(d||r)return{element:t,type:"plain-input"};let c=t.closest?.('input:not([type="hidden"]), textarea');if(c&&!this.isSkipListElement(c))return{element:c,type:"plain-input"};let p=t.getAttribute?.("role")==="textbox"?t:t.closest?.('[role="textbox"], [g_editable="true"]');if(p&&!this.isSkipListElement(p))return{element:p,type:"rich-editable"};let f=t.closest?.('[contenteditable]:not([contenteditable="false"])')||t.closest?.('[contenteditable="true"]');if(f&&!this.isSkipListElement(f))return{element:f,type:"rich-editable"};if(t.isContentEditable||t.getAttribute?.("contenteditable")==="true"||t.getAttribute?.("contenteditable")==="")return{element:t,type:"rich-editable"};let u=t.querySelector?.('input:not([type="hidden"]):not([type="password"]), textarea');if(u&&!this.isSkipListElement(u))return{element:u,type:"plain-input"}}let i=R.getDeepActiveElement();if(!i||this.isSkipListElement(i))return{element:null,type:"unsupported"};if(document.location.hostname.includes("docs.google.com")&&(i.classList.contains("kix-canvas-tile-content")||i.classList.contains("docs-texteventtarget-iframe")))return{element:i,type:"fallback"};let n=typeof HTMLInputElement<"u"&&i instanceof HTMLInputElement||i.tagName?.toLowerCase()==="input",s=typeof HTMLTextAreaElement<"u"&&i instanceof HTMLTextAreaElement||i.tagName?.toLowerCase()==="textarea";if(n||s)return{element:i,type:"plain-input"};if(i.getAttribute?.("role")==="textbox"||i.getAttribute?.("g_editable")==="true")return{element:i,type:"rich-editable"};let a=i.closest?.('[role="textbox"], [g_editable="true"]');if(a&&!this.isSkipListElement(a))return{element:a,type:"rich-editable"};if(i.isContentEditable||i.getAttribute?.("contenteditable")==="true"||i.getAttribute?.("contenteditable")==="")return{element:i,type:"rich-editable"};let o=i.closest?.('[contenteditable]:not([contenteditable="false"])')||i.closest?.('[contenteditable="true"]');if(o)return{element:o,type:"rich-editable"};let l=i.querySelector?.('input:not([type="hidden"]):not([type="password"]), textarea');if(l&&!this.isSkipListElement(l))return{element:l,type:"plain-input"};try{let d=window.getSelection();if(d&&d.anchorNode){let r=d.anchorNode.nodeType===Node.ELEMENT_NODE?d.anchorNode:d.anchorNode.parentElement,c=r?.isContentEditable?r:r?.closest?.('[contenteditable]:not([contenteditable="false"])')||r?.closest?.('[contenteditable="true"]')||r?.closest?.('[role="textbox"], [g_editable="true"]');if(c&&!this.isSkipListElement(c))return{element:c,type:"rich-editable"}}}catch{}return{element:null,type:"unsupported"}}};var k=class{static hostElement=null;static shadowRoot=null;static onSubmitCallback=null;static onCancelCallback=null;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-fillin-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; display: flex; align-items: center; justify-content: center;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
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
        background: rgba(24, 114, 222, 0.24);
        color: #3296FD;
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
        border-color: #3296FD;
        box-shadow: 0 0 0 3px rgba(37, 140, 251, 0.3);
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
        background: linear-gradient(135deg, #3296FD 0%, #1872DE 100%);
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
        box-shadow: 0 2px 8px rgba(24, 114, 222, 0.32);
        transition: transform 80ms ease, box-shadow 80ms ease;
      }
      .btn-submit:hover {
        background: linear-gradient(135deg, #258BFB 0%, #1263C5 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(24, 114, 222, 0.42);
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
    `,o.addEventListener("click",r=>{r.target===o&&this.cancel()}),o.querySelector("#fillin-form")?.addEventListener("submit",r=>{r.preventDefault(),this.submit(o)}),o.querySelector("#btn-fillin-close")?.addEventListener("click",()=>this.cancel()),o.querySelector("#btn-fillin-cancel")?.addEventListener("click",()=>this.cancel()),o.addEventListener("keydown",r=>{r.key==="Escape"&&(r.stopPropagation(),r.preventDefault(),this.cancel())}),this.shadowRoot.appendChild(o),requestAnimationFrame(()=>{o.querySelector(".field-input")?.focus()})}static submit(e){let t={};if(e.querySelectorAll(".field-input").forEach(n=>{let s=n.getAttribute("data-field")||"";t[s]=n.value.trim()}),this.onSubmitCallback){let n=this.onSubmitCallback;this.onSubmitCallback=null,n(t)}this.dismiss()}static cancel(){if(this.onCancelCallback){let e=this.onCancelCallback;this.onCancelCallback=null,e()}this.dismiss()}static dismiss(){if(!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".fillin-backdrop");e&&e.remove(),this.hostElement&&document.body.contains(this.hostElement)&&(this.hostElement.remove(),this.hostElement=null,this.shadowRoot=null)}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var A=class{static hostElement=null;static shadowRoot=null;static allSnippets=[];static filteredSnippets=[];static activeIndex=0;static onSelectCallback=null;static isVisible=!1;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-launcher-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; display: flex; align-items: center; justify-content: center;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
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
        background: rgba(24, 114, 222, 0.22);
        color: #389BFF;
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
        background: rgba(24, 114, 222, 0.32);
        border: 1px solid rgba(50, 150, 253, 0.4);
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
      `}).join(""),t.querySelectorAll(".result-item").forEach(i=>{i.addEventListener("click",n=>{n.stopPropagation();let s=Number(i.getAttribute("data-index")||"0");this.filteredSnippets[s]&&this.select(this.filteredSnippets[s])})})}}static updateActiveItem(e){e.querySelectorAll(".result-item").forEach((i,n)=>{n===this.activeIndex?(i.classList.add("active"),i.scrollIntoView({block:"nearest"})):i.classList.remove("active")})}static select(e){if(this.onSelectCallback){let t=this.onSelectCallback;this.onSelectCallback=null,t(e)}this.dismiss()}static dismiss(){if(this.isVisible=!1,!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".launcher-backdrop");e&&e.remove(),this.hostElement&&document.body.contains(this.hostElement)&&(this.hostElement.remove(),this.hostElement=null,this.shadowRoot=null)}static isOpen(){return this.isVisible}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var g=class{static hostElement=null;static shadowRoot=null;static activeIndex=0;static currentSnippets=[];static onSelectCallback=null;static isVisible=!1;static ensureContainer(){if(this.hostElement&&document.body.contains(this.hostElement))return;this.hostElement=document.createElement("div"),this.hostElement.id="snippo-palette-host",this.hostElement.style.cssText="position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none; width: 0; height: 0; overflow: visible;",this.shadowRoot=this.hostElement.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=`
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
        background: rgba(24, 114, 222, 0.32);
        border: 1px solid rgba(50, 150, 253, 0.45);
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
    `,this.shadowRoot.appendChild(e),document.body.appendChild(this.hostElement)}static show(e,t,i,n){if(!e||e.length===0){this.dismiss();return}if(this.ensureContainer(),!this.shadowRoot)return;this.currentSnippets=e.slice(0,5),this.activeIndex=0,this.onSelectCallback=n,this.isVisible=!0;let s=100,a=100;if(t&&t.x>0&&t.y>0)s=t.y+(t.height||20)+6,a=Math.min(window.innerWidth-310,Math.max(12,t.x-20)),s+230>window.innerHeight&&(s=Math.max(12,t.y-236));else if(i&&typeof i.getBoundingClientRect=="function"){let l=i.getBoundingClientRect();s=l.bottom+6,a=Math.min(window.innerWidth-310,Math.max(12,l.left)),s+230>window.innerHeight&&(s=Math.max(12,l.top-236))}let o=this.shadowRoot.querySelector(".snippo-palette");o||(o=document.createElement("div"),o.className="snippo-palette",this.shadowRoot.appendChild(o)),o.style.top=`${s}px`,o.style.left=`${a}px`,this.renderItems(o),requestAnimationFrame(()=>{o.classList.add("visible")})}static renderItems(e){let t=this.currentSnippets.map((i,n)=>{let s=n===this.activeIndex,a=i.description||i.body.replace(/\n/g," ").slice(0,45);return`
        <li class="palette-item ${s?"active":""}" data-index="${n}">
          <div class="item-top">
            <span class="item-trigger">${this.escapeHtml(i.trigger)}</span>
            <span class="item-folder">${this.escapeHtml(i.folder||"Snippet")}</span>
          </div>
          <span class="item-desc">${this.escapeHtml(a)}</span>
        </li>
      `}).join("");e.innerHTML=`
      <div class="palette-header">
        <span>SayMore Suggestions</span>
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
    `,e.onmousedown=i=>{i.preventDefault()},e.querySelectorAll(".palette-item").forEach(i=>{i.addEventListener("click",n=>{n.stopPropagation(),n.preventDefault();let s=Number(i.getAttribute("data-index")||"0");this.select(s)})})}static handleKeyDown(e){return!this.isVisible||this.currentSnippets.length===0?!1:e.key==="ArrowDown"?(e.stopPropagation(),e.preventDefault(),this.activeIndex=(this.activeIndex+1)%this.currentSnippets.length,this.updateActiveItem(),!0):e.key==="ArrowUp"?(e.stopPropagation(),e.preventDefault(),this.activeIndex=(this.activeIndex-1+this.currentSnippets.length)%this.currentSnippets.length,this.updateActiveItem(),!0):e.key==="Enter"||e.key==="Tab"?(e.stopPropagation(),e.preventDefault(),this.select(this.activeIndex),!0):e.key==="Escape"?(e.stopPropagation(),e.preventDefault(),this.dismiss(),!0):!1}static updateActiveItem(){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll(".palette-item").forEach((t,i)=>{i===this.activeIndex?(t.classList.add("active"),t.scrollIntoView({block:"nearest"})):t.classList.remove("active")})}static select(e){let t=this.currentSnippets[e];if(t&&this.onSelectCallback){let i=this.onSelectCallback;this.onSelectCallback=null,i(t)}this.dismiss()}static dismiss(){if(this.isVisible=!1,this.currentSnippets=[],!this.shadowRoot)return;let e=this.shadowRoot.querySelector(".snippo-palette");e&&(e.classList.remove("visible"),setTimeout(()=>{e.remove()},150))}static isOpen(){return this.isVisible}static escapeHtml(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}};var S=class{static lastContext=null;static targetElementRef=null;static undoTimeout=null;static record(e,t){this.undoTimeout&&clearTimeout(this.undoTimeout),this.lastContext=e,this.targetElementRef=new WeakRef(t),this.undoTimeout=setTimeout(()=>{this.clear()},6e3)}static canUndo(){return!!(this.lastContext&&this.targetElementRef?.deref())}static undo(){if(!this.lastContext||!this.targetElementRef)return!1;let e=this.targetElementRef.deref();if(!e)return this.clear(),!1;try{return this.lastContext.editorType==="plain-input"?v.undo(e,this.lastContext):this.lastContext.editorType==="rich-editable"&&y.undo(e,this.lastContext),this.clear(),!0}catch{return this.clear(),!1}}static clear(){this.undoTimeout&&(clearTimeout(this.undoTimeout),this.undoTimeout=null),this.lastContext=null,this.targetElementRef=null}};var D=class{matcher=new M;settings=F;allSnippets=[...I];isExcluded=!1;isInitialized=!1;isExpanding=!1;lastExpandedAt=0;lastActiveElement=null;async init(){try{if(this.isInitialized)return;this.isInitialized=!0;let e={};for(let t of I)e[t.trigger]={id:t.id,trigger:t.trigger,enabled:t.enabled,folder:t.folder};if(this.matcher.updateIndex(e),typeof chrome>"u"||!chrome.runtime?.id)return;this.attachListeners(),this.listenForBroadcasts(),await this.syncState()}catch{}}async syncState(){if(chrome.runtime?.id)try{if(typeof chrome<"u"&&chrome.storage?.local){let s=await chrome.storage.local.get(["verbatim_settings_v1","verbatim_trigger_index_v1","verbatim_snippets_v1"]);if(s.verbatim_settings_v1){this.settings={...F,...s.verbatim_settings_v1};let a=window.location.hostname.toLowerCase();this.isExcluded=(this.settings?.excludedDomains||[]).some(o=>a===o.toLowerCase()||a.endsWith("."+o.toLowerCase()))}s.verbatim_trigger_index_v1&&this.matcher.updateIndex(s.verbatim_trigger_index_v1),Array.isArray(s.verbatim_snippets_v1)&&s.verbatim_snippets_v1.length>0&&(this.allSnippets=s.verbatim_snippets_v1)}let e=await this.sendMessagePromise("GET_SETTINGS");if(e?.data){this.settings=e.data;let s=window.location.hostname.toLowerCase();this.isExcluded=(this.settings?.excludedDomains||[]).some(a=>s===a.toLowerCase()||s.endsWith("."+a.toLowerCase()))}if(this.isExcluded||this.settings?.enabled===!1){this.matcher.updateIndex({}),this.allSnippets=[];return}let[i,n]=await Promise.all([this.sendMessagePromise("GET_TRIGGER_INDEX"),this.sendMessagePromise("GET_ALL_SNIPPETS")]);i?.data&&this.matcher.updateIndex(i.data),n?.data&&Array.isArray(n.data)&&n.data.length>0&&(this.allSnippets=n.data)}catch{}}attachListeners(){document.addEventListener("keydown",this.handleKeyDown,!0),document.addEventListener("input",this.handleInput,!0),document.addEventListener("focusin",this.handleFocusIn,!0)}handleFocusIn=e=>{let t=e.target;t&&!C.isSkipListElement(t)&&(this.lastActiveElement=t)};listenForBroadcasts(){typeof chrome>"u"||(chrome.runtime?.onMessage&&chrome.runtime.onMessage.addListener(e=>(e?.type==="SNIPPETS_UPDATED"||e?.type==="SETTINGS_UPDATED"?this.syncState():e?.type==="OPEN_LAUNCHER"?this.openQuickLauncher():e?.type==="INSERT_SNIPPET"&&e.payload?.snippet&&this.insertSnippetFromExternal(e.payload.snippet),!1)),chrome.storage?.onChanged&&chrome.storage.onChanged.addListener((e,t)=>{t==="local"&&(e.verbatim_settings_v1||e.verbatim_trigger_index_v1)&&this.syncState()}))}handleKeyDown=e=>{if(!(this.isExcluded||this.settings?.enabled===!1)){if(e.altKey&&e.shiftKey&&(e.key==="K"||e.code==="KeyK"||e.key===" "||e.code==="Space")){e.stopPropagation(),e.preventDefault(),this.openQuickLauncher();return}if(!(g.isOpen()&&g.handleKeyDown(e))&&e.key==="Escape"&&e.isTrusted){if(g.isOpen()){g.dismiss();return}if(S.canUndo()){e.stopPropagation(),e.preventDefault(),S.undo(),L.dismiss();return}}}};handleInput=async e=>{if(this.isExcluded||this.settings?.enabled===!1||this.isExpanding||Date.now()-this.lastExpandedAt<400||typeof chrome>"u"||!chrome.runtime?.id||e.isComposing)return;let{element:t,type:i}=C.detectCurrentEditor(e.target);if(!t||i==="unsupported"){g.dismiss();return}this.lastActiveElement=t;let n="";try{i==="plain-input"?n=v.getTail(t):i==="rich-editable"&&(n=y.getTail(t))}catch{return}if(!n){g.dismiss();return}let s=this.matcher.matchTail(n);if(s){g.dismiss(),this.expandTrigger(s.snippetId,s.tailLength,s.matchedTrigger,t,i);return}this.checkInLinePalette(n,t,i)};checkInLinePalette(e,t,i){this.allSnippets.length===0&&(this.allSnippets=[...I]);let n=e.match(/(?:^|[\s,;("'])([/;:!]|,,)([a-zA-Z0-9_\-]*)$/);if(!n){g.dismiss();return}let s=n[1]+n[2],a=n[1],o=n[2].toLowerCase(),l=this.allSnippets.filter(r=>{if(r.enabled===!1)return!1;let c=r.trigger.toLowerCase();if(o.length===0)return c.startsWith(a);let p=c.replace(/^[/;:!]|,,/,"");return c.startsWith(s.toLowerCase())||p.startsWith(o)||r.description&&r.description.toLowerCase().includes(o)});if(l.length===0){g.dismiss();return}l.sort((r,c)=>{let p=r.trigger.toLowerCase().startsWith(s.toLowerCase())?0:1,f=c.trigger.toLowerCase().startsWith(s.toLowerCase())?0:1;return p-f});let d=null;i==="plain-input"?d=v.getCaretCoordinates(t):i==="rich-editable"&&(d=y.getCaretCoordinates(t)),g.show(l,d,t,r=>{this.expandTrigger(r.id,s.length,s,t,i)})}async expandTrigger(e,t,i,n,s){if(!this.isExpanding){this.isExpanding=!0;try{let a=this.allSnippets.find(d=>d.id===e);if(a)this.sendMessagePromise("EXPAND_TRIGGER",{snippetId:e}).catch(()=>{});else{let d=await this.sendMessagePromise("EXPAND_TRIGGER",{snippetId:e});d?.data&&(a=d.data)}if(!a)return;let o=T.getFillInVariables(a.body),l=null;s==="plain-input"?l=v.getCaretCoordinates(n):s==="rich-editable"&&(l=y.getCaretCoordinates(n)),o.length>0?k.show(a,o,l,d=>{this.executeExpansion(a,t,i,n,s,d)}):this.executeExpansion(a,t,i,n,s)}catch{}finally{this.lastExpandedAt=Date.now(),setTimeout(()=>{this.isExpanding=!1},150)}}}executeExpansion(e,t,i,n,s,a){let o=T.resolve(e.body,{fillValues:a}),l=null,d=null;if(s==="plain-input"){let r=n;l=v.replaceTrigger(r,t,o,e.id,i),d=v.getCaretCoordinates(r)}else s==="rich-editable"&&(l=y.replaceTrigger(n,t,o,e.id,i),d=y.getCaretCoordinates(n));l&&(S.record(l,n),this.settings?.showChip!==!1&&L.show(e.trigger,d,()=>S.undo(),this.settings?.chipDurationMs||1800,n))}openQuickLauncher(){let e=C.detectCurrentEditor();e.element&&(this.lastActiveElement=e.element),A.show(this.allSnippets,t=>{this.insertSnippetFromExternal(t)})}insertSnippetFromExternal(e){let t=this.lastActiveElement||C.detectCurrentEditor().element;if(!t)return;let i=T.getFillInVariables(e.body);if(i.length>0)k.show(e,i,null,n=>{let s=T.resolve(e.body,{fillValues:n});this.injectTextIntoElement(t,s.text)});else{let n=T.resolve(e.body);this.injectTextIntoElement(t,n.text)}}injectTextIntoElement(e,t){e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?v.insertTextDirectly(e,t):y.insertTextDirectly(e,t)}sendMessagePromise(e,t){return new Promise(i=>{try{chrome.runtime.sendMessage({type:e,payload:t},n=>{chrome.runtime.lastError?i({success:!1}):i(n)})}catch{i({success:!1})}})}},_=new D;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>_.init(),{once:!0}):_.init();})();
