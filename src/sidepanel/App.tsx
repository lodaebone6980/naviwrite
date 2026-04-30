import { useState } from "react";
import WriteTab from "./components/WriteTab";
import CollectTab from "./components/CollectTab";
import LearnTab from "./components/LearnTab";
import TrackTab from "./components/TrackTab";
import FeedbackTab from "./components/FeedbackTab";
import SettingsTab from "./components/SettingsTab";

type Tab = "write" | "collect" | "learn" | "track" | "feedback" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "write", label: "작성", icon: "✍️" },
  { id: "collect", label: "수집", icon: "🔎" },
  { id: "learn", label: "학습", icon: "📚" },
  { id: "track", label: "추적", icon: "📊" },
  { id: "feedback", label: "피드백", icon: "💡" },
  { id: "settings", label: "설정", icon: "⚙️" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("write");

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] opacity-60 tracking-wider">NaviWrite</p>
          <h1 className="text-[15px] font-bold">네이버 SEO·GEO·AEO</h1>
        </div>
        <div className="text-xs opacity-50">v1.0</div>
      </header>

      {/* Tab Bar */}
      <nav className="flex bg-white border-b border-gray-200 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-center text-[11px] font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? "text-primary border-accent"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            <span className="block text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="animate-fadeIn">
          {activeTab === "write" && <WriteTab />}
          {activeTab === "collect" && <CollectTab />}
          {activeTab === "learn" && <LearnTab />}
          {activeTab === "track" && <TrackTab />}
          {activeTab === "feedback" && <FeedbackTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
