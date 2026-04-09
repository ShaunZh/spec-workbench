"use client";

interface AnalysisCardProps {
  title: string;
  placeholder: string;
}

function AnalysisCard({ title, placeholder }: AnalysisCardProps) {
  return (
    <div className="m-3 p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
      <div className="text-xs font-semibold text-[#7c6ff7] uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="text-xs text-[#555] italic">{placeholder}</div>
    </div>
  );
}

export function AnalysisPanel() {
  return (
    <div className="w-[320px] bg-[#14141f] border-l border-[#2a2a3e] overflow-y-auto">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        Analysis Results
      </div>
      <AnalysisCard title="Summary" placeholder="No analysis yet" />
      <AnalysisCard title="Todos" placeholder="No todos yet" />
      <AnalysisCard title="Risks" placeholder="No risks identified" />
      <AnalysisCard title="Acceptance Criteria" placeholder="No criteria yet" />
      <AnalysisCard title="Open Questions" placeholder="No questions yet" />
      <div className="m-3 p-5 bg-[#1a1a2e] border border-dashed border-[#2a2a3e] rounded-lg text-center">
        <div className="text-xs text-[#666] mb-1">Completeness Score</div>
        <div className="text-2xl font-bold text-[#333]">--</div>
      </div>
      <div className="m-3 p-2 bg-transparent border border-[#2a2a3e] rounded-md text-[#555] text-xs text-center cursor-pointer">
        Export Markdown
      </div>
    </div>
  );
}