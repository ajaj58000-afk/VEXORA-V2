import type { Metadata } from "next";
import LoginCard from "@/components/auth/LoginCard";

export const metadata: Metadata = { title: "تسجيل الدخول | VEXORA" };

export default function LoginPage() {
  return <LoginCard />;
}
