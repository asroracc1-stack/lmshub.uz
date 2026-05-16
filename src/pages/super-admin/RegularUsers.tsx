import UsersManager from "./UsersManager";

export default function RegularUsers() {
  return (
    <UsersManager 
      filterRole="user" 
      title="Oddiy Userlar" 
      description="Tizimdagi barcha mustaqil (tashkilotga bog'lanmagan) foydalanuvchilarni boshqarish."
    />
  );
}
