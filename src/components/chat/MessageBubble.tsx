import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Paperclip, MoreVertical, Reply, Forward, Trash2, Pin } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface MessageBubbleProps {
  msg: any;
  isMine: boolean;
  isGroup: boolean;
  onReply?: (msg: any) => void;
  onForward?: (msg: any) => void;
  onDelete?: (msgId: string, forEveryone: boolean) => void;
  onPin?: (msgId: string) => void;
}

export default function MessageBubble({ msg, isMine, isGroup, onReply, onForward, onDelete, onPin }: MessageBubbleProps) {
  const senderName = msg.senderName || msg.sender?.fullName || "Foydalanuvchi";
  const isSeen = msg.seen;
  const isDeleted = msg.isDeleted;

  if (isDeleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
      >
        <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm space-y-1 relative italic text-muted-foreground bg-muted/30 border border-border/20`}>
          Xabar o'chirilgan
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} group relative`}
    >
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm space-y-1 relative ${
        isMine 
          ? "bg-gradient-to-br from-purple-500/90 to-violet-500/90 text-white rounded-br-sm" 
          : "bg-muted/80 text-foreground rounded-bl-sm border border-border/30 backdrop-blur-sm"
      }`}>
        
        {/* Context Menu Trigger */}
        <div className={`absolute top-1 ${isMine ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-muted/50 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMine ? "end" : "start"} className="w-40 text-xs">
              <DropdownMenuItem onClick={() => onReply?.(msg)}>
                <Reply className="mr-2 h-3.5 w-3.5" /> Javob berish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onForward?.(msg)}>
                <Forward className="mr-2 h-3.5 w-3.5" /> Yo'naltirish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPin?.(msg.id)}>
                <Pin className="mr-2 h-3.5 w-3.5" /> {msg.isPinned ? "Qadab qo'yishni bekor qilish" : "Qadab qo'yish"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete?.(msg.id, isMine)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> O'chirish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!isMine && isGroup && (
          <span className="text-[10px] font-bold text-primary block mb-0.5">
            {senderName}
          </span>
        )}

        {/* Reply Context */}
        {msg.replyToId && (
          <div className={`text-[10px] pl-2 border-l-2 mb-1 ${isMine ? 'border-purple-200 text-purple-100 bg-black/10' : 'border-primary/50 text-muted-foreground bg-primary/5'} py-1 px-2 rounded-r-md cursor-pointer truncate max-w-full`}>
            O'z javobi (qidirilmoqda...)
          </div>
        )}

        {/* Message Types */}
        {msg.messageType === "STICKER" && msg.attachmentUrl && (
          <img src={msg.attachmentUrl} alt="Sticker" className="w-24 h-24 object-contain" />
        )}
        
        {msg.messageType === "FILE" && msg.attachmentUrl && (
          <div className={`mb-1 p-2 rounded-lg border ${isMine ? "border-white/20 bg-black/10 text-white" : "border-border/40 bg-background"} flex items-center gap-2`}>
            <Paperclip className="h-4 w-4 shrink-0" />
            <a 
              href={msg.attachmentUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs font-medium truncate max-w-[180px]"
            >
              Fayl biriktirmasi
            </a>
          </div>
        )}

        {msg.messageType === "IMAGE" && msg.fileUrl && (
          <div className="mb-1 rounded-lg overflow-hidden max-w-[200px] cursor-pointer">
             <img src={msg.fileUrl} alt="Image" className="w-full h-auto object-cover" />
          </div>
        )}

        {msg.messageType === "VOICE" && msg.voiceUrl && (
          <div className={`mb-1 p-2 rounded-lg flex items-center gap-2 ${isMine ? 'bg-black/10' : 'bg-background'}`}>
             <audio controls src={msg.voiceUrl} className="h-8 w-[200px]" />
          </div>
        )}

        {msg.body && (
          <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">
            {msg.body}
          </p>
        )}

        <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${isMine ? "text-purple-50" : "text-muted-foreground"}`}>
          {msg.isPinned && <Pin className="h-2.5 w-2.5 mr-1" />}
          <span>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isMine && (
            isSeen ? <CheckCheck className="h-3 w-3 text-purple-200" /> : <Check className="h-3 w-3 opacity-70" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
