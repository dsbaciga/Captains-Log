import { useState, useEffect } from "react";

export interface SubTab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabGroupItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subTabs?: SubTab[];
  count?: number;
}

interface TabGroupProps {
  tabs: TabGroupItem[];
  activeTab: string;
  onTabChange: (tabId: string, subTabId?: string) => void;
  className?: string;
}

export default function TabGroup({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabGroupProps) {
  const [expandedTab, setExpandedTab] = useState<string | null>(activeTab);

  // Sync expanded tab with active tab
  useEffect(() => {
    setExpandedTab(activeTab);
  }, [activeTab]);

  // Calculate total count for a tab group
  const getGroupCount = (tab: TabGroupItem): number => {
    if (tab.count !== undefined) return tab.count;
    if (tab.subTabs) {
      return tab.subTabs.reduce((sum, sub) => sum + (sub.count || 0), 0);
    }
    return 0;
  };

  // Check if a tab or any of its sub-tabs is active
  const isTabActive = (tab: TabGroupItem): boolean => {
    if (tab.id === activeTab) return true;
    if (tab.subTabs) {
      return tab.subTabs.some((sub) => sub.id === activeTab);
    }
    return false;
  };

  // Get the parent tab for a sub-tab
  const getParentTab = (subTabId: string): TabGroupItem | undefined => {
    return tabs.find((tab) => tab.subTabs?.some((sub) => sub.id === subTabId));
  };

  // Handle main tab click
  const handleTabClick = (tab: TabGroupItem) => {
    if (tab.subTabs && tab.subTabs.length > 0) {
      // If clicking an already expanded tab, toggle it
      if (expandedTab === tab.id) {
        // Don't collapse, just select the first sub-tab
        onTabChange(tab.subTabs[0].id);
      } else {
        // Expand and select first sub-tab
        setExpandedTab(tab.id);
        onTabChange(tab.subTabs[0].id);
      }
    } else {
      // No sub-tabs, just select the tab
      setExpandedTab(null);
      onTabChange(tab.id);
    }
  };

  // Handle sub-tab click
  const handleSubTabClick = (subTabId: string) => {
    onTabChange(subTabId);
  };

  return (
    <div className={`bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-primary-500/10 dark:border-sky/10 overflow-hidden ${className}`}>
      {/* Mobile Tab Dropdown */}
      <div className="md:hidden p-4 border-b-2 border-primary-500/10 dark:border-sky/10">
        <select
          value={activeTab}
          onChange={(e) => {
            const newTab = e.target.value;
            const parent = getParentTab(newTab);
            if (parent) {
              setExpandedTab(parent.id);
            }
            onTabChange(newTab);
          }}
          className="w-full px-4 py-3 rounded-lg bg-white dark:bg-navy-900 border-2 border-primary-500/20 dark:border-sky/20 text-slate dark:text-warm-gray font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-sky"
          aria-label="Select tab"
        >
          {tabs.map((tab) =>
            tab.subTabs ? (
              <optgroup key={tab.id} label={tab.label}>
                {tab.subTabs.map((subTab) => (
                  <option key={subTab.id} value={subTab.id}>
                    {subTab.label}
                    {subTab.count !== undefined ? ` (${subTab.count})` : ""}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option key={tab.id} value={tab.id}>
                {tab.label}
                {tab.count !== undefined ? ` (${tab.count})` : ""}
              </option>
            )
          )}
        </select>
      </div>

      {/* Desktop Horizontal Tabs */}
      <div className="hidden md:block">
        {/* Main Tab Navigation */}
        <nav className="flex border-b-2 border-primary-500/10 dark:border-sky/10">
          {tabs.map((tab) => {
            const isActive = isTabActive(tab);
            const groupCount = getGroupCount(tab);

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex-1 py-4 px-4 text-sm font-body font-medium relative flex flex-col items-center gap-1 transition-all duration-200 ${
                  isActive
                    ? "text-primary-600 dark:text-sky bg-primary-50/50 dark:bg-sky/5"
                    : "text-slate dark:text-warm-gray hover:text-primary-600 dark:hover:text-sky hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {groupCount > 0 && (
                    <span
                      className={`ml-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
                        isActive
                          ? "bg-primary-100 dark:bg-sky/20 text-primary-700 dark:text-sky"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {groupCount}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 dark:from-sky dark:to-accent-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sub-Tab Navigation (if applicable) */}
        {tabs.map((tab) => {
          if (!tab.subTabs || !isTabActive(tab)) return null;

          return (
            <div
              key={`${tab.id}-subtabs`}
              className="flex items-center gap-1 px-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50 overflow-x-auto"
            >
              {tab.subTabs.map((subTab) => {
                const isSubActive = subTab.id === activeTab;

                return (
                  <button
                    key={subTab.id}
                    onClick={() => handleSubTabClick(subTab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                      isSubActive
                        ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-sky shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-sky hover:bg-white/50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    {subTab.icon && (
                      <span className="w-4 h-4">{subTab.icon}</span>
                    )}
                    <span>{subTab.label}</span>
                    {subTab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded-full ${
                          isSubActive
                            ? "bg-primary-100 dark:bg-sky/20 text-primary-700 dark:text-sky"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {subTab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
