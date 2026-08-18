import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, MessageSquare, X, Send, Sparkles, ChevronRight, RefreshCw, 
  FileText, UserPlus, Shield, CheckCircle2, Folder, ExternalLink, HelpCircle
} from 'lucide-react';

const PREDEFINED_QUESTIONS = [
  {
    id: 'onboarding',
    icon: UserPlus,
    label: 'How to onboard a new Consultant / Vendor?',
    query: 'How do I onboard a new Consultant or Vendor in the RC Portal?',
    answer: `To onboard a new Consultant or Vendor in the **Emami RC Portal**:

1. Click **Vendor Onboarding** from the Top Action Bar or Dashboard.
2. Fill in the **Vendor Information** (PAN Number, GST Number, Contact Person, Email, Mobile).
3. Set the **Engagement Type** (Proprietorship, Partnership, Corporate, Individual) and **Contract Terms**.
4. Select **Module Access Flags** and click **Submit Vendor Onboarding**.
5. The record is instantly sent to SAP Gateway OData (\`HeaderSet\` & \`ItemSet\`) for real-time creation.`,
    link: '/onboarding',
    linkText: 'Go to Vendor Onboarding'
  },
  {
    id: 'files',
    icon: Folder,
    label: 'How does File Repository (FileSet) work?',
    query: 'How do I view, upload, and delete files in the File Repository?',
    answer: `The **File Repository (FileSet)** allows complete document management integrated with SAP OData:

• **Hover Preview (Desktop)**: Hover over any row to view full file details, MIME type, and quick download.
• **Click Glance View**: Tap/click any document to open the full Document Glance Popup with live PDF preview.
• **Upload Document**: Click **Upload File**, select a PDF/Excel file (up to 40 chars filename), and upload to SAP (\`FILESET_CREATE_ENTITY\`).
• **Delete Documents**: Select single or bulk files and click **Delete**. FileNo is passed to SAP Gateway \`IT_KEY_TAB\` (\`FILESET_DELETE_ENTITY\`).`,
    link: '/files',
    linkText: 'Open File Repository'
  },
  {
    id: 'closure',
    icon: FileText,
    label: 'How to handle Candidate Closures?',
    query: 'How do Candidate Closures work in SAP Gateway?',
    answer: `**Candidate Closures** record candidate placements and onboarding completions:

1. Select a Consultant from the Dashboard or Consultant List.
2. Click **Add Candidate Closure** to open the Closure Form (\`/closure/:consultantId\`).
3. Enter Candidate Name, Position, Closure Date, Placement Fee, and Status.
4. Click **Save Closure**. The transaction is posted to SAP Gateway OData (\`ClosureSet\`).`,
    link: '/',
    linkText: 'Select Consultant from Dashboard'
  },
  {
    id: 'roles',
    icon: Shield,
    label: 'How do Role Maintenance & Module Access work?',
    query: 'How do I manage roles and permissions in Role Maintenance?',
    answer: `**Role Maintenance** allows administrators to manage role-based access control (RBAC):

• Navigate to **Role Maintenance** (\`/roles\`).
• View assigned permissions: \`is_active\`, \`can_view\`, \`can_edit\`, \`can_delete\`.
• Click **Edit Permissions** on any role card to toggle module access flags (\`LoginSet\` entity set).`,
    link: '/roles',
    linkText: 'Go to Role Maintenance'
  }
];

export default function RcChatbot({ isOpen: externalIsOpen, onClose: externalOnClose }) {
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val) => {
    if (externalOnClose && !val) {
      externalOnClose();
    }
    setInternalIsOpen(val);
  };

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hello! 👋 I am your **Emami RC Portal AI Assistant**. How can I help you with Consultant Onboarding, SAP FileSet, Candidate Closures, or Role Access today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options: PREDEFINED_QUESTIONS
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping]);

  const handleQuestionSelect = (qObj) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: qObj.query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: qObj.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        link: qObj.link,
        linkText: qObj.linkText
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const queryText = inputText.trim();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Answer Matching Logic based on Keywords
    setTimeout(() => {
      const lower = queryText.toLowerCase();
      let botResponse = null;

      // Developer & Engineering Team Recognition Query
      const hasJeevan = lower.includes('jeevan') || lower.includes('jeevana') || lower.includes('thapa') || lower.includes('ui') || lower.includes('frontend') || lower.includes('front-end');
      const hasSahin = lower.includes('sahin') || lower.includes('md sahin') || lower.includes('backend') || lower.includes('back-end') || lower.includes('server') || lower.includes('logic');
      const hasTeam = lower.includes('who built') || lower.includes('who created') || lower.includes('who developed') || lower.includes('who made') || lower.includes('developer') || lower.includes('architect') || lower.includes('built this') || lower.includes('team') || lower.includes('creator') || lower.includes('creators');

      if (hasJeevan && !hasSahin) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: `👨‍💻 **Jeevan Thapa** — *Lead UI Developer & Application Architect*\n\n• **Modern UI/UX Design System**: Crafted with Tailwind CSS, sleek dark modes, maroon accents, and responsive mobile-first cards.\n• **In-Browser Document Engine**: Embedded real-time PDF viewers and client-side SheetJS Excel parsing for zero-download document previews.\n• **Role-Based UI Control**: Designed granular RBAC permissions and self-account security protection rules.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsTyping(false);
        return;
      }

      if (hasSahin && !hasJeevan) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: `⚙️ **MD Sahin** — *Lead Backend Architect & Logic Engineer*\n\n• **Enterprise Backend Architecture**: Designed robust Node.js proxy services and secure SAP ABAP Gateway integrations.\n• **High-Performance Logic & Security**: Implemented CSRF token handshakes, cookie jar synchronization, and optimized Base64 data streaming.\n• **Reliable Data Pipeline**: Built bulletproof API endpoints ensuring 100% data integrity across all portal modules.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsTyping(false);
        return;
      }

      if ((hasJeevan && hasSahin) || hasTeam) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: `🌟 **Emami RC Portal Engineering Team**\n\nThis enterprise application was built by an expert development team:\n\n👨‍💻 **Jeevan Thapa** — *Lead UI Developer & Application Architect*\n• **Modern UI/UX Design System**: Crafted with Tailwind CSS, sleek dark modes, maroon accents, and responsive mobile-first cards.\n• **In-Browser Document Engine**: Embedded real-time PDF viewers and client-side SheetJS Excel parsing for zero-download document previews.\n• **Role-Based UI Control**: Designed granular RBAC permissions and self-account security protection rules.\n\n⚙️ **MD Sahin** — *Lead Backend Architect & Logic Engineer*\n• **Enterprise Backend Architecture**: Designed robust Node.js proxy services and secure SAP ABAP Gateway integrations.\n• **High-Performance Logic & Security**: Implemented CSRF token handshakes, cookie jar synchronization, and optimized Base64 data streaming.\n• **Reliable Data Pipeline**: Built bulletproof API endpoints ensuring 100% data integrity across all portal modules.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsTyping(false);
        return;
      }

      if (lower.includes('onboard') || lower.includes('vendor') || lower.includes('consultant')) {
        botResponse = PREDEFINED_QUESTIONS[0];
      } else if (lower.includes('file') || lower.includes('upload') || lower.includes('download') || lower.includes('delete') || lower.includes('fileset') || lower.includes('hub')) {
        botResponse = PREDEFINED_QUESTIONS[1];
      } else if (lower.includes('closure') || lower.includes('candidate') || lower.includes('fee')) {
        botResponse = PREDEFINED_QUESTIONS[2];
      } else if (lower.includes('role') || lower.includes('permission') || lower.includes('access')) {
        botResponse = PREDEFINED_QUESTIONS[3];
      } else if (lower.includes('sap') || lower.includes('odata') || lower.includes('api') || lower.includes('gateway')) {
        botResponse = PREDEFINED_QUESTIONS[4];
      }

      if (botResponse) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: botResponse.answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            link: botResponse.link,
            linkText: botResponse.linkText
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: `I understand you are asking about: "${queryText}".\n\nHere are the main topics I can assist you with:`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            options: PREDEFINED_QUESTIONS
          }
        ]);
      }
      setIsTyping(false);
    }, 750);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 1,
        sender: 'bot',
        text: `Chat reset! 👋 How can I assist you with Emami RC Portal today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        options: PREDEFINED_QUESTIONS
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
      {/* Floating Chatbot Window */}
      {isOpen && (
        <div className="relative w-[360px] sm:w-[420px] h-[580px] rounded-3xl bg-white shadow-2xl border border-rose-200 overflow-hidden flex flex-col animate-fadeIn">
          
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-[#800A36] via-[#600727] to-[#40041a] p-4 text-white flex items-center justify-between border-b border-rose-900/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative p-2 rounded-2xl bg-white/10 border border-white/20">
                <Bot className="h-6 w-6 text-rose-200" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#800A36]" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  Emami RC AI Assistant <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                </h3>
                <p className="text-[10px] font-bold text-rose-200/90 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" /> Active • Connected to SAP Gateway
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Reset Chat"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70 text-xs">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs whitespace-pre-line leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#800A36] text-white rounded-br-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none font-normal'
                  }`}
                >
                  {msg.text}

                  {/* Optional Action Link inside Bot Response */}
                  {msg.link && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          navigate(msg.link);
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#800A36] hover:underline cursor-pointer"
                      >
                        {msg.linkText} <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">{msg.time}</span>

                {/* Predefined Quick Questions List */}
                {msg.options && (
                  <div className="mt-3 space-y-2 w-full">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick Questions:</p>
                    {msg.options.map((opt) => {
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleQuestionSelect(opt)}
                          className="w-full text-left p-2.5 rounded-xl bg-white border border-rose-200/80 hover:border-[#800A36] hover:bg-rose-50/60 transition flex items-center justify-between group shadow-2xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-rose-100/70 text-[#800A36] group-hover:bg-[#800A36] group-hover:text-white transition">
                              <IconComp className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#800A36] transition">{opt.label}</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#800A36] group-hover:translate-x-0.5 transition" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Bot Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 p-2 bg-white rounded-2xl border border-slate-200/80 w-24">
                <Bot className="h-4 w-4 text-[#800A36] animate-spin" />
                <span className="text-[10px] font-bold">Typing...</span>
              </div>
            )}
          </div>

          {/* Quick Category Chips Bar */}
          <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
            {PREDEFINED_QUESTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => handleQuestionSelect(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:border-[#800A36] hover:text-[#800A36] transition cursor-pointer"
              >
                {q.label.split('?')[0]}
              </button>
            ))}
          </div>

          {/* Text Input Bar */}
          <form onSubmit={handleSendText} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about Emami RC Portal..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-[#800A36] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-[#800A36] text-white hover:bg-[#600727] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
