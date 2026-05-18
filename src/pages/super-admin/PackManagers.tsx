import UsersManager from "./UsersManager";

export default function PackManagers() {
  return (
    <UsersManager
      filterRole="payment_manager"
      title="Pack Managerlar"
      description="Tizim obunalari va to'lovlarini boshqaruvchi xodimlar"
    />
  );
}
