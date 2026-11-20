import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, HelpCircle } from 'lucide-react';
import { siteInfo } from '../siteInfo';
import { FAQ, answerFor, resolveAnswer } from './chatbotFaq';
import { useOnlinePayments } from '../utils/paymentOptions';
import './ChatWidget.css';

const STORAGE_KEY = 'coreman-chat'; // per-tab chat history (sessionStorage)
const GREETING = { role: 'bot', content: "Hi! I'm the CoreMan help bot. Pick a question below or type your own.", showMenu: true };

function loadHistory() {
  try { const v = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return Array.isArray(v) && v.length ? v : [GREETING]; }
  catch { return [GREETING]; }
}
function saveHistory(msgs) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* storage unavailable */ }
}

/** Minimal, safe markdown: [text](/path or https://), **bold**, line breaks, "- " / "1. " lists. No HTML injection. */
function RichText({ text }) {
  const inline = (str, key) => {
    const parts = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0, m, i = 0;
    while ((m = re.exec(str))) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      if (m[1]) {
        const href = m[2];
        if (href.startsWith('/')) parts.push(<Link key={`${key}-${i++}`} to={href}>{m[1]}</Link>);
        else if (/^https:\/\//.test(href)) parts.push(<a key={`${key}-${i++}`} href={href} target="_blank" rel="noreferrer">{m[1]}</a>);
        else parts.push(m[1]);
      } else parts.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
      last = re.lastIndex;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts;
  };
  const out = [];
  let list = [];
  const flush = (k) => { if (list.length) { out.push(<ul key={`ul-${k}`}>{list}</ul>); list = []; } };
  text.split('\n').forEach((line, idx) => {
    const item = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (item) { list.push(<li key={idx}>{inline(item[1], idx)}</li>); return; }
    flush(idx);
    if (line.trim()) out.push(<p key={idx}>{inline(line, idx)}</p>);
  });
  flush('end');
  return <>{out}</>;
}

function WhatsAppIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">
      <path d="M16.04 3C8.86 3 3.04 8.82 3.04 16c0 2.3.6 4.53 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.22 29 29 23.18 29 16S23.22 3 16.04 3Zm0 23.7c-2.02 0-3.99-.54-5.71-1.57l-.41-.24-3.96 1.04 1.06-3.86-.27-.4A10.66 10.66 0 0 1 5.34 16c0-5.9 4.8-10.7 10.7-10.7 5.89 0 10.66 4.8 10.66 10.7s-4.77 10.7-10.66 10.7Zm5.86-8.02c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.72.16-.21.32-.83 1.05-1.01 1.26-.19.21-.37.24-.69.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.5.14-.66.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

/** Basic FAQ chatbot (no AI): quick-question buttons plus keyword matching, with WhatsApp for everything else. */
export default function ChatWidget() {
  const { pathname } = useLocation();
  const online = useOnlinePayments();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { saveHistory(messages); }, [messages]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing, open]);
  useEffect(() => { if (open && window.innerWidth >= 640) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (pathname.startsWith('/admin')) return null;

  // WhatsApp message includes the product link when the customer is on a product page.
  const waText = pathname.startsWith('/product/')
    ? `Hi CoreMan! I have a question about this product: ${window.location.origin}${pathname}`
    : 'Hi CoreMan! I have a question.';
  const waHref = siteInfo.whatsapp ? `https://wa.me/${siteInfo.whatsapp}?text=${encodeURIComponent(waText)}` : null;

  const reply = (userText, answer) => {
    setMessages(m => [...m, { role: 'user', content: userText }]);
    setTyping(true);
    setTimeout(() => { setTyping(false); setMessages(m => [...m, { role: 'bot', ...answer }]); }, 450);
  };

  const ask = (faq) => !typing && reply(faq.question, { content: resolveAnswer(faq, { online }) });
  const send = () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    reply(text, answerFor(text, { online }));
  };

  const last = messages[messages.length - 1];

  return (
    <div className="fab-stack">
      {open && (
        <section className="chat-panel" role="dialog" aria-label="CoreMan help">
          <header className="chat-head">
            <div className="chat-title">
              <span className="chat-avatar"><HelpCircle size={16} /></span>
              <div><strong>CoreMan Help</strong><small>Instant answers to common questions</small></div>
            </div>
            <div className="chat-head-actions">
              {messages.length > 1 && <button className="chat-text-btn" onClick={() => setMessages([GREETING])}>Restart</button>}
              <button className="chat-icon-btn" onClick={() => setOpen(false)} aria-label="Close help"><X size={18} /></button>
            </div>
          </header>

          <div className="chat-list" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
                {m.role === 'user' ? <p>{m.content}</p> : <RichText text={m.content} />}
              </div>
            ))}
            {typing && <div className="chat-msg assistant typing" aria-label="Typing"><span /><span /><span /></div>}
            {!typing && (
              <div className="chat-suggestions">
                {(last?.showMenu ? FAQ : FAQ.slice(0, 4)).map(f => <button key={f.id} onClick={() => ask(f)}>{f.question}</button>)}
                {waHref && <a className="chat-wa-chip" href={waHref} target="_blank" rel="noreferrer"><WhatsAppIcon size={14} /> Talk to a person</a>}
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={e => { e.preventDefault(); send(); }}>
            <textarea ref={inputRef} rows={1} value={input} maxLength={300} placeholder="Type a question, e.g. delivery charge"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Your question" />
            <button type="submit" disabled={!input.trim() || typing} aria-label="Send"><Send size={18} /></button>
          </form>
        </section>
      )}

      {waHref && !open && (
        <a className="fab fab-whatsapp" href={waHref} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp" title="Chat on WhatsApp">
          <WhatsAppIcon />
        </a>
      )}
      <button className={`fab fab-chat ${open ? 'is-open' : ''}`} onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close help' : 'Open help chat'} aria-expanded={open}>
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && <span className="fab-label">Help</span>}
      </button>
    </div>
  );
}
