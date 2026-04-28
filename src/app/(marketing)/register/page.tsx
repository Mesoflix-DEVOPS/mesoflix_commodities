import { redirect } from "next/navigation";

export default function RegisterRedirect() {
    redirect("/login?mode=register");
}
