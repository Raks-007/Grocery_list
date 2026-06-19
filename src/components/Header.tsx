import { Bell, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const { user } = useAuth();
  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="h-16 flex items-center justify-between px-8 glass-panel border-b border-[#27272a]/50 sticky top-0 z-30">
      <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-full px-4 py-1.5 w-64 focus-within:border-purple-500/50 transition-colors">
        <Search className="w-4 h-4 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search items..." 
          className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-zinc-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full border border-[#09090b]" />
        </button>
        <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-zinc-400">User</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-medium text-sm text-white">
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}
