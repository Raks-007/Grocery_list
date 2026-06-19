import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";

interface ShoppingList {
  id: number;
  list_name: string;
  created_at: string;
  status: "Pending" | "Completed";
  item_count: number;
}

export function ShoppingLists() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    setLoading(true);
    const data = await apiFetch("/shopping-lists");
    if (data.success) setLists(data.data);
    setLoading(false);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    const data = await apiFetch("/shopping-lists", {
      method: "POST",
      body: JSON.stringify({ list_name: newListName }),
    });

    if (data.success) {
      setLists([data.data, ...lists]);
      setNewListName("");
      setIsAdding(false);
      navigate(`/lists/${data.data.id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Shopping Lists</h1>
          <p className="text-zinc-400 mt-1 text-sm">Manage your weekly groceries and special event lists.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-500 transition flex items-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Create List
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#18181b]/50 p-4 border border-zinc-800 rounded-xl mb-6 flex gap-3 items-center overflow-hidden"
            onSubmit={handleCreateList}
          >
            <input 
              type="text" 
              placeholder="E.g., Weekend Party Groceries..." 
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <button type="submit" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium">Save List</button>
            <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white px-3 text-sm">Cancel</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px] relative">
        {loading && <div className="absolute inset-0 flex mt-10 justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>}
        {!loading && lists.map((list, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            key={list.id}
            onClick={() => navigate(`/lists/${list.id}`)}
            className="group relative bg-[#18181b]/50 border border-[#27272a] rounded-xl p-5 hover:border-purple-500/50 transition-colors cursor-pointer overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                list.status === 'Pending' ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400"
              )}>
                {list.status}
              </div>
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition text-zinc-400 group-hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-xl font-medium text-white mb-2">{list.list_name}</h3>
            
            <div className="flex items-center gap-4 text-sm text-zinc-500 mt-4">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>{new Date(list.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>{list.item_count} items</span>
              </div>
            </div>

            {list.status === 'Pending' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
