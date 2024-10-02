import { Rabbit } from "../rabbit";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg container">
      <div className="font-mono my-4 bg-black text-white p-4 rounded-lg">
        <div className="flex items-center w-full my-4">
          <div className="my-4 w-full">Welcome to PARCNET</div>
          <div className="w-8 h-8">
            <Rabbit />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
