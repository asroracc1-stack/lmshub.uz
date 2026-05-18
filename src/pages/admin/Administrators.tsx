import UsersManager from "../super-admin/UsersManager";
import { useTranslation } from "react-i18next";

export default function AdminAdministrators() {
  const { t } = useTranslation();
  return (
    <UsersManager 
      filterRole="administrator" 
      title={t("nav.administrators", "Administratorlar")} 
      description="Tashkilot administratorlarini boshqarish" 
    />
  );
}
