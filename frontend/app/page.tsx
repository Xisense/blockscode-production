import { redirect } from "next/navigation";

export default function Home() {
  // Redirect root to the new dashboard page
  redirect("/dashboard/student");
}
