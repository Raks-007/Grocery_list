import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, ArrowRight, ListTodo, Package, Activity, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export function Dashboard() {
  const [lists, setLists] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [listsRes, itemsRes] = await Promise.all([
      apiFetch("/shopping-lists"),
      apiFetch("/master-items")
    ]);
    if (listsRes.success) setLists(listsRes.data);
    if (itemsRes.success) setItems(itemsRes.data);
    setLoading(false);
  };

  const activeLists = lists.filter(l => l.status === "Pending");

  const stats = [
    { label: "Active Lists", value: activeLists.length, icon: ListTodo, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Total Items", value: items.length, icon: Package, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Total Lists Created", value: lists.length, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  if (loading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Overview</h1>
          <p className="text-zinc-400 mt-1 text-sm">Here's what is happening with your inventory today.</p>
        </div>
        <Link to="/lists" className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New List
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="border border-[#27272a] bg-[#18181b]/30 rounded-xl p-6 relative overflow-hidden"
          >
            <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-zinc-400 text-sm font-medium">{stat.label}</p>
            <p className="text-3xl font-semibold mt-1">{stat.value}</p>
            
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl ${stat.bg} opacity-20`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#27272a] bg-[#18181b]/30 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-medium text-lg">Active Shopping Lists</h2>
            <Link to="/lists" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 group">
              View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeLists.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center border-t border-zinc-800">No active shopping lists. Go create one!</p>}
            {activeLists.slice(0, 5).map((list, i) => (
              <Link to={`/lists/${list.id}`} key={list.id} className="block">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex justify-between items-center p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition cursor-pointer mb-2"
                >
                  <div>
                    <p className="font-medium text-white group-hover:text-purple-400 transition-colors">{list.list_name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{list.item_count} items • Created {new Date(list.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        <div className="border border-[#27272a] bg-[#18181b]/30 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-medium text-lg">Low Stock Alerts</h2>
          </div>
          <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800 h-[215px]">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-zinc-300 font-medium">All stocked up!</p>
            <p className="text-sm text-zinc-500 mt-1">No items are running critically low right now.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
