import { Newsreader, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import "./workbench.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Plus Jakarta Sans is the closest Google Fonts humanist sans match for General
// Sans (which lives on Fontshare and isn't available via next/font/google).
// Per DESIGN.md the body face must be a humanist sans with strong tabular nums;
// Plus Jakarta Sans satisfies that and avoids the Inter/Geist/Roboto anti-pattern.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-workbench-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

export default async function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth auth check at the layout level. middleware.ts also needs
  // /queue, /badge, /drafter added to its protected matcher; this layout
  // check is a second layer in case the matcher is misconfigured.
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div
      className={`${newsreader.variable} ${plusJakarta.variable} ${jetbrains.variable} workbench-root`}
    >
      {children}
    </div>
  );
}
