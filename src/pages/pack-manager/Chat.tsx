import { useTranslation } from "react-i18next";
import ChatWindow from "@/components/chat/ChatWindow";

export default function PackManagerChat() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">{t("dynamic.messages.xabarlar")}</h1>
        <p className="text-sm text-muted-foreground">{t("dynamic.chat.platforma_foydalanuvchilari_bilan_muloqo")}</p>
      </div>
      <ChatWindow />
    </div>
  );
}

