import UsersManager from "../super-admin/UsersManager";
import { useTranslation } from "react-i18next";

export default function AdminUsers() {
  const { t } = useTranslation();
  return (
    <UsersManager 
      title={t("nav.users", "Foydalanuvchilar")} 
      description="Tashkilotingizdagi barcha foydalanuvchilarni boshqarish" 
    />
  );
}

