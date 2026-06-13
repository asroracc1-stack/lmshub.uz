import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface ChatHeaderProps {
  chatPartner: any;
  activeConversation: any;
  typingUsers: Record<string, boolean>;
  onlineStatus: Record<string, { online: boolean; lastSeen: string }>;
  getInitials: (name: string) => string;
  getRoleBadge: (role: string) => React.ReactNode;
}

export default function ChatHeader({
  chatPartner,
  activeConversation,
  typingUsers,
  onlineStatus,
  getInitials,
  getRoleBadge
}: ChatHeaderProps) {
  return (
    <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20 shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-border shadow-sm">
          <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
            {chatPartner ? getInitials(chatPartner.fullName) : "G"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">
              {chatPartner ? chatPartner.fullName : "Guruh suhbati"}
            </h3>
            {chatPartner && getRoleBadge(chatPartner.role)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {typingUsers[activeConversation.id] ? (
              <span className="text-[10px] text-primary animate-pulse font-medium">Yozmoqda...</span>
            ) : (
              <>
                <span className={`h-1.5 w-1.5 rounded-full ${chatPartner && onlineStatus[chatPartner.id]?.online ? "bg-purple-500 animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-[10px] text-muted-foreground">
                  {chatPartner && onlineStatus[chatPartner.id]?.online ? "onlayn" : 
                   chatPartner && onlineStatus[chatPartner.id]?.lastSeen ? `oxirgi faollik: ${new Date(onlineStatus[chatPartner.id]!.lastSeen).toLocaleTimeString()}` : "oflayn"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <Badge variant="outline" className="gap-1 border-primary/20 text-primary bg-primary/5 text-[10px] hidden md:flex">
        <Sparkles className="h-3 w-3" /> STOMP Websocket
      </Badge>
    </div>
  );
}
