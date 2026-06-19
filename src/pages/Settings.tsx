import { useState } from "react";
import { motion } from "motion/react";
import { User, Bell, Palette } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Settings() {
  const { user } = useAuth();
  
  // Local state for the inputs and toggles
  const [fullName, setFullName] = useState(user?.name || "User");
  const [email, setEmail] = useState(user?.email || "user@example.com");
  
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [listCompletionSummaries, setListCompletionSummaries] = useState(false);
  
  const [darkMode, setDarkMode] = useState(true);
  const [compactLists, setCompactLists] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate an API call to save settings
    setTimeout(() => {
      setIsSaving(false);
      alert("Settings saved successfully!");
    }, 800);
  };

  const sections = [
    {
      id: "profile",
      title: "Profile Settings",
      icon: User,
      description: "Manage your personal information and preferences.",
      content: (
        <div className="space-y-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      )
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      description: "Configure when and how you receive alerts.",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-zinc-300 font-medium text-sm">Low stock alerts</span>
            <button 
              onClick={() => setLowStockAlerts(!lowStockAlerts)}
              className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${lowStockAlerts ? 'bg-purple-600' : 'bg-zinc-800'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${lowStockAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-zinc-300 font-medium text-sm">List completion summaries</span>
            <button 
              onClick={() => setListCompletionSummaries(!listCompletionSummaries)}
              className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${listCompletionSummaries ? 'bg-purple-600' : 'bg-zinc-800'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${listCompletionSummaries ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: Palette,
      description: "Customize the look and feel of your dashboard.",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-zinc-300 font-medium text-sm">Dark Mode</span>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${darkMode ? 'bg-purple-600' : 'bg-zinc-800'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-zinc-300 font-medium text-sm">Compact lists</span>
            <button 
              onClick={() => setCompactLists(!compactLists)}
              className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${compactLists ? 'bg-purple-600' : 'bg-zinc-800'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${compactLists ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Settings</h1>
        <p className="text-zinc-400 mt-1 text-sm">Manage your account settings and preferences.</p>
      </header>

      <div className="space-y-6">
        {sections.map((section, i) => (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={section.id} 
            className="bg-[#18181b]/30 border border-[#27272a] rounded-xl overflow-hidden"
          >
            <div className="p-6 border-b border-[#27272a]/50 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                <section.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-medium text-white text-lg">{section.title}</h2>
                <p className="text-zinc-500 text-sm mt-0.5">{section.description}</p>
              </div>
            </div>
            
            <div className="p-6">
              {section.content}
            </div>
          </motion.section>
        ))}
      </div>
      
      <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50"
          >
              {isSaving ? "Saving..." : "Save Changes"}
          </button>
      </div>
    </div>
  );
}
