import { AdminMode } from "@/components/games/admin-mode";
export const metadata = {
  title: "Demo & testing mode — Learning Games",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminMode />;
}
