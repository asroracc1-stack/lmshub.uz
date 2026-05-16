import UsersManager from "./UsersManager";
export default function Administrators() {
  return <UsersManager filterRole="administrator" title="Administratorlar" description="O'quv jarayoni boshqaruvchilari" />;
}
