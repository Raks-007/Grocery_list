import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Filter, MoreHorizontal, PackageOpen, Loader2, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";

interface MasterItem {
  id: number;
  item_name: string;
  category_id: number;
  category_name?: string;
  unit: string;
  default_quantity: number;
}
interface Category {
  id: number;
  category_name: string;
}

export function MasterItems() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newItemName, setNewItemName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, catsRes] = await Promise.all([
      apiFetch("/master-items"),
      apiFetch("/categories")
    ]);
    if (itemsRes.success) setItems(itemsRes.data);
    if (catsRes.success) setCategories(catsRes.data);
    setLoading(false);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newCategoryId) return;
    
    const data = await apiFetch("/master-items", {
      method: "POST",
      body: JSON.stringify({ 
        item_name: newItemName,
        category_id: parseInt(newCategoryId),
        unit: newUnit,
        default_quantity: 1
      }),
    });

    if (data.success) {
      loadData();
      setNewItemName("");
      setNewUnit("pcs");
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    const data = await apiFetch(`/master-items/${id}`, {
      method: "DELETE"
    });
    
    if (data.success) {
      setItems(items.filter(i => i.id !== id));
    } else {
      alert(data.message || "Failed to delete item.");
    }
    setOpenMenuId(null);
  };

  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.category_name && item.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Master Items</h1>
          <p className="text-zinc-400 mt-1 text-sm">Your inventory database. Manage items across all categories.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#18181b]/50 p-6 border border-zinc-800 rounded-xl mb-6 overflow-hidden"
            onSubmit={handleCreateItem}
          >
            <h3 className="font-medium text-lg mb-4 text-white">Add New Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Item Name</label>
                <input 
                  type="text" 
                  required
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
                <select 
                  required
                  value={newCategoryId}
                  onChange={e => setNewCategoryId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Unit</label>
                <input 
                  type="text" 
                  required
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition">Save Item</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex gap-4 items-center">
        <div className="flex-1 flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 focus-within:border-purple-500/50 transition-colors">
            <Search className="w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search items by name or category..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-zinc-600"
            />
        </div>
      </div>

      <div className="bg-[#18181b]/30 border border-[#27272a] rounded-xl overflow-hidden min-h-[200px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-black/20 text-xs uppercase tracking-wider text-zinc-500 font-medium">
                <th className="p-4 px-6 font-medium">Name</th>
                <th className="p-4 px-6 font-medium">Category</th>
                <th className="p-4 px-6 font-medium">Default Unit</th>
                <th className="p-4 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/50">
              {filteredItems.map((item, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  key={item.id} 
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex flex-shrink-0 items-center justify-center">
                        <PackageOpen className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.item_name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">ID: {item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/50 border border-zinc-700/50 text-zinc-300">
                      {item.category_name || "Uncategorized"}
                    </span>
                  </td>
                  <td className="p-4 px-6 text-zinc-400 text-sm">
                    {item.unit}
                  </td>
                  <td className="p-4 px-6 text-right relative" ref={openMenuId === item.id ? menuRef : null}>
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {openMenuId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          className="absolute right-6 top-8 w-36 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden"
                        >
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Item
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
        
        {!loading && filteredItems.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No items found. Create one.
          </div>
        )}
      </div>
    </div>
  );
}
