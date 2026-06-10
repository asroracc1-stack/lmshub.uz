import ChatWindow from "@/components/chat/ChatWindow";

export default function PackManagerChat() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">Xabarlar</h1>
        <p className="text-sm text-muted-foreground">Platforma foydalanuvchilari bilan muloqot</p>
      </div>
      <ChatWindow />
    </div>
  );
}

