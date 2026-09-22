"use client";

import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";

type Panel = {
  id: string;
  label: string;
  title: string;
  status: string;
};

export function WorkflowPanels({ panels, children }: { panels: Panel[]; children: ReactNode }) {
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "");
  const panelChildren = Children.toArray(children).filter(
    (child): child is ReactElement<{ "data-workflow-panel"?: string }> => isValidElement(child),
  );
  const activePanel = panelChildren.find((child) => child.props["data-workflow-panel"] === activeId) ?? panelChildren[0];

  return (
    <section className="rounded-[2rem] border border-[#cfe0d4] bg-[#e9f3ec] p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60766a]">Project flow</p>
        <h2 className="mt-1 text-2xl font-semibold text-[#20322a]">Work the project in order</h2>
      </div>
      <div aria-label="Project workflow" className="mt-4 grid gap-2 md:grid-cols-3" role="tablist">
        {panels.map((panel) => {
          const active = panel.id === activeId;
          return (
            <button
              aria-controls={`workflow-${panel.id}`}
              aria-selected={active}
              className={`rounded-2xl border px-4 py-3 text-left transition ${active ? "border-[#173f97] bg-[#173f97] text-white shadow-sm" : "border-[#b9d2c0] bg-white text-[#20322a] hover:bg-[#f7fbf8]"}`}
              id={`workflow-tab-${panel.id}`}
              key={panel.id}
              onClick={() => setActiveId(panel.id)}
              role="tab"
              type="button"
            >
              <span className={`block text-xs font-semibold uppercase tracking-[0.16em] ${active ? "text-blue-100" : "text-[#60766a]"}`}>{panel.label}</span>
              <span className="mt-1 block font-semibold">{panel.title}</span>
              <span className={`mt-1 block text-sm ${active ? "text-blue-100" : "text-[#6f756c]"}`}>{panel.status}</span>
            </button>
          );
        })}
      </div>
      {activePanel ? <div aria-labelledby={`workflow-tab-${activeId}`} className="mt-4" id={`workflow-${activeId}`} role="tabpanel">{activePanel}</div> : null}
    </section>
  );
}
