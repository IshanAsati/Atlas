import { Rail } from "@/components/shell/Rail";

/**
 * The panel shell: a fixed control rail and the working surface beside
 * it. Focus Mode and onboarding sit outside this layout on purpose —
 * both are meant to be the only thing on screen.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen">
      <Rail />
      <main className="px-5 pb-28 pt-8 sm:px-8 md:pb-12 md:pl-[112px] md:pr-10 lg:pr-14">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
