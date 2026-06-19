import { motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ListTodo, 
  Tags, 
  Package, 
  History, 
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Shopping Lists", path: "/lists", icon: ListTodo },
  { name: "Categories", path: "/categories", icon: Tags },
  { name: "Master Items", path: "/items", icon: Package },
  { name: "Purchase History", path: "/history", icon: History },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="w-64 flex flex-col h-screen fixed left-0 top-0 glass-panel border-r border-[#27272a]/50 p-4 z-40">
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-[2px]">
          <div className="w-full h-full bg-[#09090b] rounded-md flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
        </div>
        <span className="font-display font-semibold text-lg tracking-tight">Inventory.</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                  isActive ? "text-white bg-white/5" : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-5 bg-purple-500 rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className="w-4 h-4" />
                {item.name}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
