import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, History, Calendar, ArrowUpRight, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";

export function PurchaseHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await apiFetch("/purchase-history");
    if (data.success) {
      setHistory(data.data);
    }
    setLoading(false);
  };

  const totalSpent = history.reduce((acc, curr) => acc + (curr.total_spent || 0), 0);
  const totalItems = history.reduce((acc, curr) => acc + (curr.total_items || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Purchase History</h1>
          <p className="text-zinc-400 mt-1 text-sm">Review past shopping trips and expenses.</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#18181b]/30 border border-[#27272a] rounded-xl p-5">
            <div className="text-zinc-400 text-sm mb-1">Total Spent</div>
            <div className="text-2xl font-semibold">${totalSpent.toFixed(2)}</div>
        </div>
        <div className="bg-[#18181b]/30 border border-[#27272a] rounded-xl p-5">
            <div className="text-zinc-400 text-sm mb-1">Items Bought</div>
            <div className="text-2xl font-semibold">{totalItems}</div>
        </div>
        <div className="bg-[#18181b]/30 border border-[#27272a] rounded-xl p-5">
            <div className="text-zinc-400 text-sm mb-1">Completed Trips</div>
            <div className="text-2xl font-semibold">{history.length}</div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Recent Trips</h2>
          {loading && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500 w-8 h-8" /></div>}
          {!loading && history.length > 0 ? history.map((list, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={list.id} 
                className="flex items-center justify-between p-5 rounded-xl bg-[#18181b]/30 border border-[#27272a] hover:border-zinc-700 transition cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-purple-400 transition-colors">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">{list.list_name}</h3>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(list.completed_date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{list.total_items} items</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-white font-medium">${(list.total_spent || 0).toFixed(2)}</div>
                        <div className="text-xs text-zinc-500 text-emerald-400">Completed</div>
                    </div>
                </div>
              </motion.div>
          )) : !loading ? (
              <div className="p-12 text-center text-zinc-500 bg-[#18181b]/20 border border-[#27272a] rounded-xl flex flex-col items-center">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                      <History className="w-5 h-5" />
                  </div>
                  No completed lists yet.
              </div>
          ) : null}
      </div>
    </div>
  );
}
