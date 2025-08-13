import { ModeToggle } from './mode-toggle';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/vercel.svg" alt="Vercel Logo" className="h-8 w-8" />
          <h1 className="text-xl font-bold">Vercel Clone</h1>
        </div>
        <ModeToggle />
      </div>
    </header>
  )
}