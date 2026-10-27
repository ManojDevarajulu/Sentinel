"use client";

import React from "react";

interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "visualizer", label: "Graph Explorer" },
    { id: "blueprint", label: "Architecture" },
    { id: "cli", label: "CLI & MCP" },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-6 bg-[rgba(10,10,11,0.94)] backdrop-blur-md border-b border-[#222228]">
      <div className="flex items-center gap-6">
        <button
          onClick={() => onTabChange("overview")}
          className="flex items-center gap-2.5 text-[#f0f0f2] transition-colors focus:outline-none"
        >
          <span className="font-head text-[17px] font-extrabold tracking-[0.12em] uppercase leading-none">
            SENTINEL
          </span>
        </button>

        <nav className="flex gap-1 h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center px-4 h-14 font-mono text-[11px] border-b-2 tracking-wide transition-all ${
                activeTab === tab.id
                  ? "text-[#f0f0f2] border-[#f0f0f2] font-semibold"
                  : "text-[#8888a0] border-transparent font-medium hover:text-[#f0f0f2]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#111114] border border-[#2e2e38] text-[#55556a] tracking-wide">
          Local AST Engine
        </span>
        <a
          href="https://github.com/ManojDevarajulu/Sentinel"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md font-mono text-[11px] font-medium text-[#f0f0f2] bg-[#111114] border border-[#2e2e38] hover:bg-[#18181d] hover:border-[rgba(255,255,255,0.2)] hover:text-white transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
