import React,{createContext,useContext,useEffect,useRef} from 'react';
import {X,ArrowUpRight} from 'lucide-react';
import {storage} from './storage.mjs';
export const LibraryContext=createContext(null);
export const useLibrary=()=>useContext(LibraryContext);
export function IconButton({label,children,...props}){return <button className="icon-button" title={label} aria-label={label} {...props}>{children}</button>;}
export function Empty({icon:Icon,title,description,children}){return <div className="empty-state">{Icon&&<div className="empty-icon"><Icon size={30}/></div>}<h3>{title}</h3><p>{description}</p>{children}</div>;}
export function Modal({title,description,children,onClose,wide=false}){
 const ref=useRef();
 useEffect(()=>{const old=document.activeElement;ref.current?.querySelector('input,textarea,button,select')?.focus();const handler=e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const elements=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.offsetParent!==null);if(!elements.length)return;const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);old?.focus();};},[onClose]);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className={'modal '+(wide?'wide':'')} role="dialog" aria-modal="true" aria-label={title} ref={ref}><div className="modal-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div><IconButton label="Close dialog" onClick={onClose}><X size={20}/></IconButton></div>{children}</section></div>;
}
export function Field({label,children,help}){return <label className="field"><span>{label}</span>{children}{help&&<small>{help}</small>}</label>;}
export function SectionHeading({eyebrow,title,description,children}){return <div className="section-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{children}</div>;}
export function ExternalLink({url,children}){const {toast}=useLibrary();return <button className="external-link" onClick={()=>storage.openExternal(url).catch(e=>toast(e.message,'error'))}>{children}<ArrowUpRight size={13}/></button>;}
