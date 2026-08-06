import { VibeApiApp } from "@/components/VibeApiApp";
import { LocaleProvider } from "@/components/LocaleProvider";

export default function Home() {
  return <LocaleProvider><VibeApiApp /></LocaleProvider>;
}
