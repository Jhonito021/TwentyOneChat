import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'; // CSS importé séparément

// ─── Configuration ──────────────────────────────────────────────────────────
// ⚠️ Remplacez ces valeurs par celles de votre projet Supabase
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

// ─── Client Supabase (optionnel) ─────────────────────────────────────────────
// Décommentez pour utiliser Supabase
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Mock data pour démonstration ─────────────────────────────────────────────
const MOCK_CONTACTS = [
  { id: "1", name: "Alice Martin", avatar: null, status: "online", last_seen: null },
  { id: "2", name: "Bob Dupont", avatar: null, status: "offline", last_seen: "Il y a 5 min" },
  { id: "3", name: "Clara Petit", avatar: null, status: "online", last_seen: null },
  { id: "4", name: "David Moreau", avatar: null, status: "away", last_seen: "Il y a 1h" },
  { id: "5", name: "Emma Bernard", avatar: null, status: "offline", last_seen: "Hier" },
];

const MOCK_MESSAGES = {
  "1": [
    { id: "m1", content: "Salut ! Comment ça va ? 😊", sender_id: "1", created_at: new Date(Date.now() - 3600000).toISOString(), read: true },
    { id: "m2", content: "Très bien merci ! Et toi ?", sender_id: "me", created_at: new Date(Date.now() - 3500000).toISOString(), read: true },
    { id: "m3", content: "Super ! T'as vu le nouveau projet ?", sender_id: "1", created_at: new Date(Date.now() - 3400000).toISOString(), read: true },
    { id: "m4", content: "Pas encore, tu m'envoies le lien ?", sender_id: "me", created_at: new Date(Date.now() - 300000).toISOString(), read: true },
    { id: "m5", content: "Bien sûr, je te l'envoie de suite ! 🚀", sender_id: "1", created_at: new Date(Date.now() - 60000).toISOString(), read: false },
  ],
  "2": [
    { id: "m6", content: "Hey, t'es dispo demain ?", sender_id: "2", created_at: new Date(Date.now() - 86400000).toISOString(), read: true },
    { id: "m7", content: "Oui, après 14h c'est bon !", sender_id: "me", created_at: new Date(Date.now() - 82800000).toISOString(), read: true },
  ],
  "3": [
    { id: "m8", content: "La réunion est annulée 🎉", sender_id: "3", created_at: new Date(Date.now() - 1800000).toISOString(), read: false },
  ],
  "4": [],
  "5": [
    { id: "m9", content: "Bon week-end !", sender_id: "5", created_at: new Date(Date.now() - 172800000).toISOString(), read: true },
    { id: "m10", content: "Merci, toi aussi ! 😄", sender_id: "me", created_at: new Date(Date.now() - 172700000).toISOString(), read: true },
  ],
};

// ─── Emojis ───────────────────────────────────────────────────────────────────
const EMOJIS = ["😀","😂","😊","😍","🥰","😎","🤔","😅","🙏","👍","❤️","🔥","✨","🎉","🚀","💯","😭","😤","🤣","😇","😋","🤗","😏","😬","🤩","😴","🥳","💪","👏","🙌"];

// ─── Utilitaires ───────────────────────────────────────────────────────────────
function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatDateSeparator(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return "Aujourd'hui";
  if (diff < 172800000) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      groups.push({ type: "separator", label: formatDateSeparator(msg.created_at), id: `sep-${d}` });
      lastDate = d;
    }
    groups.push({ type: "message", ...msg });
  });
  return groups;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ChatApp() {
  const [theme, setTheme] = useState("dark");
  const [contacts] = useState(MOCK_CONTACTS);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // PWA install
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Appliquer le thème
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (activeContact) scrollToBottom(false);
  }, [activeContact, scrollToBottom]);

  useEffect(() => {
    if (activeContact && messages[activeContact.id]) scrollToBottom();
  }, [messages, activeContact, scrollToBottom]);

  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!atBottom);
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const lastMsg = (contactId) => {
    const msgs = messages[contactId] || [];
    return msgs[msgs.length - 1] || null;
  };

  const unreadCount = (contactId) => {
    return (messages[contactId] || []).filter(
      (m) => m.sender_id !== "me" && !m.read
    ).length;
  };

  const sendMessage = () => {
    if (!input.trim() || !activeContact) return;
    const newMsg = {
      id: `m-${Date.now()}`,
      content: input.trim(),
      sender_id: "me",
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));
    setInput("");
    setShowEmoji(false);

    // Simuler une réponse
    const contactId = activeContact.id;
    setIsTyping(true);
    setTimeout(() => {
      const replies = [
        "Super ! 😄", "Ah oui, intéressant !", "Je vois ce que tu veux dire.",
        "Ok, je note ça.", "Parfait, merci !", "👍", "On en reparle demain ?",
        "Bonne idée !", "Ça marche pour moi.", "Excellent ! 🚀",
      ];
      const reply = {
        id: `m-${Date.now() + 1}`,
        content: replies[Math.floor(Math.random() * replies.length)],
        sender_id: contactId,
        created_at: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), reply],
      }));
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectContact = (contact) => {
    setActiveContact(contact);
    setMessages((prev) => ({
      ...prev,
      [contact.id]: (prev[contact.id] || []).map((m) => ({ ...m, read: true })),
    }));
    if (window.innerWidth <= 768) setSidebarVisible(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
  };

  const currentMessages = activeContact ? groupByDate(messages[activeContact.id] || []) : [];
  const onlineCount = contacts.filter((c) => c.status === "online").length;

  return (
    <div className="chat-app">
      {/* Sidebar */}
      <div className={`sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h1>Chat<span>.</span></h1>
          <div className="header-actions">
            <button
              className={`icon-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title="Changer le thème"
            >
              <i className={`fa-solid fa-${theme === "dark" ? "sun" : "moon"}`} />
            </button>
            <button className="icon-btn" title="Nouveau chat">
              <i className="fa-solid fa-pen-to-square" />
            </button>
            <button className="icon-btn" title="Paramètres">
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>
          </div>
        </div>

        <div className="search-wrap">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              placeholder="Rechercher ou démarrer une discussion"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="icon-btn clear-btn" onClick={() => setSearch("")}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        <div className="online-count">
          <i className="fa-solid fa-circle" />
          {onlineCount} contact{onlineCount > 1 ? "s" : ""} en ligne
        </div>

        <div className="contacts-list">
          {filteredContacts.length === 0 ? (
            <div className="no-contacts">Aucun contact trouvé</div>
          ) : (
            filteredContacts.map((contact) => {
              const last = lastMsg(contact.id);
              const count = unreadCount(contact.id);
              return (
                <div
                  key={contact.id}
                  className={`contact-item ${activeContact?.id === contact.id ? "active" : ""}`}
                  onClick={() => selectContact(contact)}
                >
                  <div className="avatar">
                    <div className="avatar-circle">{getInitials(contact.name)}</div>
                    <div className={`status-dot ${contact.status}`} />
                  </div>
                  <div className="contact-info">
                    <div className="contact-top">
                      <span className="contact-name">{contact.name}</span>
                      {last && <span className="contact-time">{formatTime(last.created_at)}</span>}
                    </div>
                    <div className="contact-preview">
                      <span className="preview-text">
                        {last ? (
                          <>
                            {last.sender_id === "me" && (
                              <i className="fa-solid fa-check-double" />
                            )}
                            {last.content}
                          </>
                        ) : (
                          <span className="empty-preview">Démarrer une conversation</span>
                        )}
                      </span>
                      {count > 0 && <span className="unread-badge">{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="chat-panel">
        <div className="chat-bg-pattern" />

        {activeContact ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button className="icon-btn back-btn" onClick={() => setSidebarVisible(true)}>
                <i className="fa-solid fa-arrow-left" />
              </button>
              <div className="avatar">
                <div className="avatar-circle avatar-sm">{getInitials(activeContact.name)}</div>
                <div className={`status-dot ${activeContact.status}`} />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">{activeContact.name}</div>
                <div className={`chat-header-status ${isTyping ? "typing" : activeContact.status}`}>
                  {isTyping
                    ? "est en train d'écrire..."
                    : activeContact.status === "online"
                    ? "En ligne"
                    : activeContact.last_seen || "Hors ligne"}
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn" title="Appel vidéo">
                  <i className="fa-solid fa-video" />
                </button>
                <button className="icon-btn" title="Appel audio">
                  <i className="fa-solid fa-phone" />
                </button>
                <button className="icon-btn" title="Plus d'options">
                  <i className="fa-solid fa-ellipsis-vertical" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="messages-area"
              ref={messagesAreaRef}
              onScroll={handleScroll}
            >
              {currentMessages.length === 0 ? (
                <div className="empty-messages">
                  <i className="fa-regular fa-comment-dots" />
                  Commencez la conversation !
                </div>
              ) : (
                currentMessages.map((item) =>
                  item.type === "separator" ? (
                    <div key={item.id} className="date-separator">
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className={`msg-wrapper ${item.sender_id === "me" ? "out" : "in"}`}
                    >
                      <div className={`bubble ${item.sender_id === "me" ? "out" : "in"}`}>
                        {item.content}
                        <div className="bubble-meta">
                          <span className="bubble-time">{formatTime(item.created_at)}</span>
                          {item.sender_id === "me" && (
                            <i
                              className={`fa-solid fa-check-double read-icon ${item.read ? "read" : ""}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )
              )}

              {isTyping && (
                <div className="msg-wrapper in">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom btn */}
            {showScrollBtn && (
              <button className="scroll-btn" onClick={() => scrollToBottom()}>
                <i className="fa-solid fa-chevron-down" />
              </button>
            )}

            {/* Emoji picker */}
            {showEmoji && (
              <div className="emoji-grid">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    className="emoji-btn-item"
                    onClick={() => setInput((v) => v + e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="input-area">
              <button className="icon-btn attach-btn" title="Joindre un fichier">
                <i className="fa-solid fa-paperclip" />
              </button>
              <textarea
                ref={inputRef}
                className="input-box"
                placeholder="Message"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="icon-btn emoji-btn"
                title="Emoji"
                onClick={() => setShowEmoji((v) => !v)}
              >
                <i className="fa-regular fa-face-smile" />
              </button>
              <button className="send-btn" onClick={sendMessage} title="Envoyer">
                <i className="fa-solid fa-paper-plane" />
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fa-brands fa-rocketchat" />
            </div>
            <h2>Bienvenue sur Chat.</h2>
            <p>Sélectionnez une conversation pour commencer à discuter avec vos contacts.</p>
            <div className="features-tags">
              {["🔒 Chiffré", "⚡ Temps réel", "📱 Multiplateforme"].map((tag) => (
                <span key={tag} className="feature-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PWA Install banner */}
      {showInstallBanner && (
        <div className="install-banner">
          <i className="fa-solid fa-download" />
          <p>
            Installer <span>Chat.</span> sur votre appareil
          </p>
          <button className="install-btn" onClick={handleInstall}>
            Installer
          </button>
          <button className="close-banner" onClick={() => setShowInstallBanner(false)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </div>
  );
}