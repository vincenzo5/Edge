import JournalModuleShell from "@/app/components/journal/JournalModuleShell";

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <JournalModuleShell>{children}</JournalModuleShell>;
}
