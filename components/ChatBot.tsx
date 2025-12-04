import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Greetings, Collector. I am TCG-Nurse. How can I assist you with the TCGMeta ecosystem or Cardify.club today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', text: userMessage }]
        }),
      });

      // Check if it's a redirect response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (data.shouldRedirect && data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
          setMessages(prev => [...prev, { role: 'model', text: data.text }]);
          setIsLoading(false);
          return;
        }
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullResponse += data.text;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = fullResponse;
                    return newMessages;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Error: Connection to Neural Net interrupted. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 hover:scale-110 ${isOpen ? 'w-12 h-12 bg-red-500 rounded-full flex items-center justify-center rotate-90 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'w-32 h-32 bg-transparent'}`}
      >
        {isOpen ? (
          <X className="text-black w-6 h-6" />
        ) : (
          <img 
            src="/gennie-character-girl.png" 
            alt="Gennie" 
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(0,243,255,0.4)]"
          />
        )}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-[350px] md:w-[400px] h-[500px] bg-gray-900/95 backdrop-blur-xl border border-neon-blue/30 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-display font-bold text-white tracking-wider flex-1">TCG-Nurse<span className="text-neon-blue text-xs ml-2">ONLINE</span></h3>
          <Sparkles className="w-4 h-4 text-neon-purple" />
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="p-4 border-b border-white/10 bg-black/30">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Quick Questions</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What is TCGMeta?",
                "How to mint NFTs?",
                "What is Cardify?",
                "How to list my NFT?"
              ].map((question, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    if (isLoading) return;
                    const userMessage = question;
                    setInput('');
                    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
                    setIsLoading(true);

                    try {
                      const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          messages: [...messages, { role: 'user', text: userMessage }]
                        }),
                      });

                      const contentType = response.headers.get('content-type');
                      if (contentType?.includes('application/json')) {
                        const data = await response.json();
                        if (data.shouldRedirect && data.redirectUrl) {
                          window.open(data.redirectUrl, '_blank');
                          setMessages(prev => [...prev, { role: 'model', text: data.text }]);
                          setIsLoading(false);
                          return;
                        }
                      }

                      const reader = response.body?.getReader();
                      const decoder = new TextDecoder();
                      let fullResponse = "";
                      setMessages(prev => [...prev, { role: 'model', text: '' }]);

                      if (reader) {
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;

                          const chunk = decoder.decode(value);
                          const lines = chunk.split('\n');

                          for (const line of lines) {
                            if (line.startsWith('data: ')) {
                              try {
                                const data = JSON.parse(line.slice(6));
                                if (data.text) {
                                  fullResponse += data.text;
                                  setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1].text = fullResponse;
                                    return newMessages;
                                  });
                                }
                              } catch (e) {
                                // Skip invalid JSON
                              }
                            }
                          }
                        }
                      }
                    } catch (error) {
                      console.error("Chat error:", error);
                      setMessages(prev => [...prev, { role: 'model', text: "Error: Connection to Neural Net interrupted. Please try again." }]);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-sans bg-white/5 hover:bg-white/10 border border-white/10 hover:border-neon-blue/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-3 rounded-lg text-sm font-sans leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neon-purple/20 border border-neon-purple/30 text-white rounded-br-none' 
                    : 'bg-white/5 border border-white/10 text-gray-300 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-3 rounded-lg rounded-bl-none flex gap-1">
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <div className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about TCGMeta..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-4 pr-12 text-sm text-white focus:border-neon-blue focus:outline-none transition-colors"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-1 top-1 p-1.5 bg-neon-blue rounded-full text-black hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
