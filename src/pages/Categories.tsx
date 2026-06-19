import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, MoreVertical, LayoutGrid, List as ListIcon, Loader2, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";

interface Category {
  id: number;
  category_name: string;
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await apiFetch("/categories");
    if (data.success) {
      setCategories(data.data);
    }
    setLoading(false);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    const data = await apiFetch("/categories", {
      method: "POST",
      body: JSON.stringify({ category_name: newCatName }),
    });

    if (data.success) {
      setCategories([...categories, data.data]);
      setNewCatName("");
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const data = await apiFetch(`/categories/${id}`, {
      method: "DELETE"
    });
    
    if (data.success) {
      setCategories(categories.filter(c => c.id !== id));
    } else {
      alert(data.message || "Cannot delete category. It might be in use.");
    }
    setOpenMenuId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Categories</h1>
          <p className="text-zinc-400 mt-1 text-sm">Organize your items into custom categories.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-500 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </header>
      
      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-[#18181b]/50 p-4 border border-zinc-800 rounded-xl mb-6 flex gap-3 items-center"
          onSubmit={handleCreateCategory}
        >
          <input 
            type="text" 
            placeholder="Category Name" 
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            autoFocus
          />
          <button type="submit" className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium">
            Save
          </button>
          <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white px-3 text-sm">
            Cancel
          </button>
        </motion.form>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={category.id}
              className="group relative bg-[#18181b]/30 border border-[#27272a] hover:border-zinc-700 rounded-xl p-5 transition-colors"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 text-purple-400">
                  <span className="text-xl font-bold">{category.category_name.charAt(0).toUpperCase()}</span>
                </div>
                
                <div className="relative" ref={openMenuId === category.id ? menuRef : null}>
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                    className="text-zinc-500 hover:text-white transition p-1"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {openMenuId === category.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 mt-2 w-36 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden"
                      >
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-white group-hover:text-purple-400 transition-colors">
                {category.category_name}
              </h3>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
