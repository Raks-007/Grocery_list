import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Loader2, Plus, CheckCircle2, Circle, Search, Send, Check, Download, FileText, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";

export function ShoppingListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const [listRes, masterRes] = await Promise.all([
      apiFetch(`/shopping-lists/${id}`),
      apiFetch("/master-items")
    ]);
    if (listRes.success) setList(listRes.data);
    if (masterRes.success) setMasterItems(masterRes.data);
    setLoading(false);
  };

  const toggleItem = async (itemId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setList({
      ...list,
      items: list.items.map((i: any) => i.id === itemId ? { ...i, purchased: newStatus } : i)
    });
    
    await apiFetch(`/shopping-lists/${id}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ purchased: newStatus })
    });
  };

  const addItemToList = async (masterItem: any) => {
    const data = await apiFetch(`/shopping-lists/${id}/items`, {
      method: "POST",
      body: JSON.stringify({
        master_item_id: masterItem.id,
        quantity: masterItem.default_quantity,
        unit: masterItem.unit
      })
    });
    if (data.success) {
      setList({ ...list, items: [...list.items, data.data] });
    }
  };

  const removeItem = async (itemId: number) => {
    setList({ ...list, items: list.items.filter((i: any) => i.id !== itemId) });
    await apiFetch(`/shopping-lists/${id}/items/${itemId}`, { method: "DELETE" });
  };

  const completeList = async () => {
    const spent = Math.floor(Math.random() * 50) + 10;
    const res = await apiFetch(`/shopping-lists/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ total_spent: spent })
    });
    if (res.success) {
      navigate('/history');
    }
  };

  const generateListText = () => {
    const pending = list.items.filter((i: any) => !i.purchased);
    const purchased = list.items.filter((i: any) => i.purchased);
    
    let text = `Shopping List: ${list.list_name}\n`;
    text += `Date: ${new Date(list.created_at).toLocaleDateString()}\n`;
    text += `Status: ${list.status}\n`;
    text += `${"=".repeat(40)}\n\n`;
    
    if (pending.length > 0) {
      text += `ITEMS TO BUY (${pending.length}):\n`;
      text += `${"-".repeat(30)}\n`;
      pending.forEach((i: any, idx: number) => {
        text += `${idx + 1}. ${i.item_name} — ${i.quantity} ${i.unit} [${i.category_name}]\n`;
      });
      text += `\n`;
    }
    
    if (purchased.length > 0) {
      text += `PURCHASED (${purchased.length}):\n`;
      text += `${"-".repeat(30)}\n`;
      purchased.forEach((i: any, idx: number) => {
        text += `${idx + 1}. ✓ ${i.item_name} — ${i.quantity} ${i.unit} [${i.category_name}]\n`;
      });
      text += `\n`;
    }
    
    text += `${"=".repeat(40)}\n`;
    text += `Total Items: ${list.items.length}\n`;
    text += `Purchased: ${purchased.length} / ${list.items.length}\n`;
    
    return text;
  };

  const downloadAsTxt = () => {
    const text = generateListText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.list_name.replace(/\s+/g, "_")}_shopping_list.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadAsPdf = () => {
    const pending = list.items.filter((i: any) => !i.purchased);
    const purchased = list.items.filter((i: any) => i.purchased);
    
    const htmlContent = `
      <html>
      <head>
        <title>${list.list_name} - Shopping List</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #222; background: #fff; }
          h1 { color: #7c3aed; margin-bottom: 4px; font-size: 28px; }
          .subtitle { color: #888; margin-bottom: 24px; font-size: 14px; }
          .section-title { font-size: 16px; font-weight: 600; color: #333; margin: 20px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; padding: 10px 12px; background: #f3f0ff; color: #7c3aed; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
          tr:hover { background: #fafafa; }
          .purchased td { color: #999; text-decoration: line-through; }
          .check { color: #10b981; font-weight: bold; }
          .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-top: 24px; font-size: 14px; }
          .summary strong { color: #7c3aed; }
          .category-badge { background: #f3f0ff; color: #7c3aed; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>🛒 ${list.list_name}</h1>
        <div class="subtitle">Created: ${new Date(list.created_at).toLocaleDateString()} &nbsp;|&nbsp; Status: ${list.status}</div>

        ${pending.length > 0 ? `
          <div class="section-title">Items To Buy (${pending.length})</div>
          <table>
            <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th>Category</th></tr></thead>
            <tbody>
              ${pending.map((i: any, idx: number) => `
                <tr><td>${idx + 1}</td><td>${i.item_name}</td><td>${i.quantity}</td><td>${i.unit}</td><td><span class="category-badge">${i.category_name}</span></td></tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""}

        ${purchased.length > 0 ? `
          <div class="section-title">Purchased (${purchased.length})</div>
          <table>
            <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th>Category</th></tr></thead>
            <tbody>
              ${purchased.map((i: any, idx: number) => `
                <tr class="purchased"><td><span class="check">✓</span></td><td>${i.item_name}</td><td>${i.quantity}</td><td>${i.unit}</td><td><span class="category-badge">${i.category_name}</span></td></tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""}

        <div class="summary">
          <strong>Summary:</strong> ${list.items.length} total items &nbsp;|&nbsp; ${purchased.length} purchased &nbsp;|&nbsp; ${pending.length} remaining
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
    setShowExportMenu(false);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  if (!list) return <div className="p-20 text-center text-zinc-500">List not found</div>;

  const filteredMasterItems = masterItems.filter(m => m.item_name.toLowerCase().includes(search.toLowerCase()) && !list.items.some((i: any) => i.master_item_id === m.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/lists')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Lists
      </button>

      <header className="flex justify-between items-end bg-[#18181b]/30 p-6 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${list.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
              {list.status}
            </span>
            <span className="text-zinc-500 text-sm">{new Date(list.created_at).toLocaleDateString()}</span>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-white mb-2">{list.list_name}</h1>
          <p className="text-zinc-400 text-sm">{list.items.length} items total • {list.items.filter((i: any) => i.purchased).length} purchased</p>
        </div>
        
        <div className="flex gap-3">
          {list.status === 'Pending' && (
             <>
               <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send to Store
                </button>
                
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={downloadAsTxt}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      >
                        <FileText className="w-4 h-4 text-purple-400" />
                        Download as TXT
                      </button>
                      <button
                        onClick={downloadAsPdf}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition border-t border-zinc-800"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        Download as PDF
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
               </div>

               <button 
                onClick={completeList}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500 transition flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Finish Trip
              </button>
             </>
          )}
        </div>
      </header>

      {list.status === 'Pending' && (
        <div className="bg-[#18181b]/30 p-4 border border-zinc-800 rounded-xl">
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search master items to add..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setIsAdding(true)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <AnimatePresence>
            {isAdding && search && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {filteredMasterItems.length === 0 ? <p className="text-sm text-zinc-500 p-2">No matching items found. Add it to Master Items first.</p> : null}
                {filteredMasterItems.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => addItemToList(m)}
                    className="w-full text-left p-3 text-sm flex justify-between items-center bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition"
                  >
                    <span>{m.item_name} <span className="text-zinc-500 text-xs ml-2">{m.category_name}</span></span>
                    <Plus className="w-4 h-4 text-purple-400" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium pl-1">Items To Buy</h2>
        {list.items.length === 0 && <p className="text-zinc-500 text-sm pl-1">No items added to this list yet.</p>}
        {list.items.map((item: any, i: number) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            key={item.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${item.purchased ? 'bg-zinc-900/50 border-zinc-800/50 opacity-60' : 'bg-[#18181b] border-[#27272a] hover:border-zinc-700'}`}
          >
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => list.status === 'Pending' && toggleItem(item.id, item.purchased)}>
              {item.purchased ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <Circle className="w-6 h-6 text-zinc-600 hover:text-purple-400 transition" />
              )}
              <div>
                <p className={`font-medium ${item.purchased ? 'text-zinc-500 line-through' : 'text-white'}`}>{item.item_name}</p>
                <div className="flex gap-2 text-xs text-zinc-500 mt-1">
                  <span>{item.quantity} {item.unit}</span>
                  <span>•</span>
                  <span>{item.category_name}</span>
                </div>
              </div>
            </div>
            {list.status === 'Pending' && (
              <button onClick={() => removeItem(item.id)} className="text-xs text-red-400/70 hover:text-red-400 p-2 transition flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
