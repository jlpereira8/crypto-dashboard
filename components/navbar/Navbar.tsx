export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <h1 className="text-xl font-semibold">Crypto Dashboard</h1>
        <nav className="flex gap-4 text-sm">
          <a className="hover:underline" href="#">Home</a>
          <a className="hover:underline" href="#">About</a>
        </nav>
      </div>
    </header>
  );
}