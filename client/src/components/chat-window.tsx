import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, MoreVertical, Search, Phone, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Contact, Message } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import chatBackground from "@assets/generated_images/subtle_doodle_pattern_for_chat_background.png";

interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export function ChatWindow({ contact, messages, onSendMessage }: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative flex-1 min-w-[400px]">
      {/* Chat Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" 
           style={{ backgroundImage: `url(${chatBackground})`, backgroundRepeat: 'repeat', backgroundSize: '400px' }} />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 z-10">
        <div className="flex items-center gap-3 cursor-pointer">
          <Avatar>
            <AvatarImage src={contact.avatar} />
            <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-medium text-gray-900">{contact.name}</h2>
            <p className="text-xs text-gray-500 truncate max-w-[300px]">
              {contact.company ? `${contact.company} • ` : ""} 
              Click here for contact info
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-gray-500">
            <button className="hover:text-gray-700"><Video className="w-5 h-5" /></button>
            <button className="hover:text-gray-700"><Phone className="w-5 h-5" /></button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button className="hover:text-gray-700"><Search className="w-5 h-5" /></button>
          <button className="hover:text-gray-700"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-5 z-10">
        <div className="flex flex-col gap-2 pb-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === 0;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full",
                  isMe ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[65%] px-3 py-2 rounded-lg text-sm shadow-sm",
                    isMe ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className={cn(
                    "text-[10px] text-gray-500 mt-1 flex items-center gap-1",
                    isMe ? "justify-end" : "justify-end"
                  )}>
                    {msg.timestamp}
                    {isMe && (
                      <span className={cn(
                        "ml-1",
                        msg.status === 'read' ? "text-blue-500" : "text-gray-400"
                      )}>
                        ✓✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 bg-gray-50 z-10 flex items-center gap-2">
        <button className="text-gray-500 hover:text-gray-700 p-2">
          <Smile className="w-6 h-6" />
        </button>
        <button className="text-gray-500 hover:text-gray-700 p-2">
          <Paperclip className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <Input
            className="w-full bg-white border-none focus-visible:ring-0 text-base py-6"
            placeholder="Type a message"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {inputText.trim() ? (
             <Button 
             onClick={handleSend}
             size="icon"
             className="bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 flex items-center justify-center transition-transform hover:scale-105"
           >
             <Send className="w-5 h-5 ml-0.5" />
           </Button>
        ) : (
             <button className="text-gray-500 hover:text-gray-700 p-2">
                <span className="sr-only">Voice Message</span>
                <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className="" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M11.999,14.942c2.001,0,3.531-1.53,3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531 S8.469,2.35,8.469,4.35v7.061C8.469,13.412,9.999,14.942,11.999,14.942z M18.237,11.412c0,3.531-2.904,6.412-6.237,6.412 s-6.237-2.881-6.237-6.412H4.173c0,4.037,3.054,7.381,6.961,7.943v3.876h1.732v-3.876c3.906-0.561,6.961-3.906,6.961-7.943H18.237z"></path></svg>
             </button>
        )}
      </div>
    </div>
  );
}
