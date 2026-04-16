"use client";

import { useEffect, useState } from "react";
import { AnalysisResult, getArtifacts, ArtifactResponse } from "@/lib/api";

interface AnalysisPanelProps {
  conversationId: number | null;
  liveResult: AnalysisResult | null;
}

export function AnalysisPanel({ conversationId, liveResult }: AnalysisPanelProps) {
  const [latestArtifact, setLatestArtifact] = useState<ArtifactResponse | null>(null);

  useEffect(() => {
    if (liveResult) return;

    if (!conversationId) {
      setLatestArtifact(null);
      return;
    }

    const loadArtifacts = async () => {
      try {
        const artifacts = await getArtifacts(conversationId);
        setLatestArtifact(artifacts.length > 0 ? artifacts[0] : null);
      } catch {
        setLatestArtifact(null);
      }
    };

    loadArtifacts();
  }, [conversationId, liveResult]);

  const isEmpty = !liveResult && !latestArtifact;

  if (!conversationId) {
    return (
      <div className="w-[320px] bg-[#14141f] border-l border-[#2a2a3e] overflow-y-auto">
        <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
          Analysis Results
        </div>
        <div className="flex items-center justify-center h-64 text-[#555] text-sm">
          Select a conversation
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] bg-[#14141f] border-l border-[#2a2a3e] overflow-y-auto">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        Analysis Results
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-64 text-[#555] text-sm text-center px-4">
          <div className="mb-2">No analysis yet</div>
          <div className="text-xs text-[#444]">
            Send a message in analysis mode to generate results
          </div>
        </div>
      )}

      {liveResult && (
        <LiveAnalysisCards result={liveResult} />
      )}

      {!liveResult && latestArtifact && (
        <ArtifactAnalysisCards artifact={latestArtifact} />
      )}

      {/* Placeholders for future features */}
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

function LiveAnalysisCards({ result }: { result: AnalysisResult }) {
  return (
    <>
      <AnalysisCard title="Summary">
        <p className="text-xs text-[#ccc]">{result.summary}</p>
      </AnalysisCard>

      <AnalysisCard title="Todos">
        <ul className="text-xs text-[#ccc] space-y-1">
          {result.todos.map((todo, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">{i + 1}.</span>
              <span>{todo}</span>
            </li>
          ))}
          {result.todos.length === 0 && <li className="text-[#555] italic">No todos</li>}
        </ul>
      </AnalysisCard>

      <AnalysisCard title="Risks">
        <div className="space-y-2">
          {result.risks.map((risk, i) => (
            <div key={i} className="p-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded">
              <div className="text-xs font-medium text-[#e0e0e0]">{risk.title}</div>
              <div className="text-xs text-[#888] mt-1">{risk.description}</div>
            </div>
          ))}
          {result.risks.length === 0 && <div className="text-xs text-[#555] italic">No risks identified</div>}
        </div>
      </AnalysisCard>

      <AnalysisCard title="Acceptance Criteria">
        <ul className="text-xs text-[#ccc] space-y-1">
          {result.acceptance_criteria.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">☐</span>
              <span>{c}</span>
            </li>
          ))}
          {result.acceptance_criteria.length === 0 && <li className="text-[#555] italic">No criteria</li>}
        </ul>
      </AnalysisCard>

      <AnalysisCard title="Open Questions">
        <ul className="text-xs text-[#ccc] space-y-1">
          {result.open_questions.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#f59e0b]">?</span>
              <span>{q}</span>
            </li>
          ))}
          {result.open_questions.length === 0 && <li className="text-[#555] italic">No questions</li>}
        </ul>
      </AnalysisCard>
    </>
  );
}

function ArtifactAnalysisCards({ artifact }: { artifact: ArtifactResponse }) {
  const todos = artifact.todos_json ? JSON.parse(artifact.todos_json) : [];
  const risks = artifact.risks_json ? JSON.parse(artifact.risks_json) : [];
  const acceptance = artifact.acceptance_json ? JSON.parse(artifact.acceptance_json) : [];
  const questions = artifact.questions_json ? JSON.parse(artifact.questions_json) : [];

  return (
    <>
      {artifact.summary && (
        <AnalysisCard title="Summary">
          <p className="text-xs text-[#ccc]">{artifact.summary}</p>
        </AnalysisCard>
      )}
      <AnalysisCard title="Todos">
        <ul className="text-xs text-[#ccc] space-y-1">
          {todos.map((todo: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">{i + 1}.</span>
              <span>{todo}</span>
            </li>
          ))}
          {todos.length === 0 && <li className="text-[#555] italic">No todos</li>}
        </ul>
      </AnalysisCard>
      <AnalysisCard title="Risks">
        <div className="space-y-2">
          {risks.map((risk: { title: string; description: string }, i: number) => (
            <div key={i} className="p-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded">
              <div className="text-xs font-medium text-[#e0e0e0]">{risk.title}</div>
              <div className="text-xs text-[#888] mt-1">{risk.description}</div>
            </div>
          ))}
          {risks.length === 0 && <div className="text-xs text-[#555] italic">No risks identified</div>}
        </div>
      </AnalysisCard>
      <AnalysisCard title="Acceptance Criteria">
        <ul className="text-xs text-[#ccc] space-y-1">
          {acceptance.map((c: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">☐</span>
              <span>{c}</span>
            </li>
          ))}
          {acceptance.length === 0 && <li className="text-[#555] italic">No criteria</li>}
        </ul>
      </AnalysisCard>
      <AnalysisCard title="Open Questions">
        <ul className="text-xs text-[#ccc] space-y-1">
          {questions.map((q: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#f59e0b]">?</span>
              <span>{q}</span>
            </li>
          ))}
          {questions.length === 0 && <li className="text-[#555] italic">No questions</li>}
        </ul>
      </AnalysisCard>
    </>
  );
}

function AnalysisCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="m-3 p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
      <div className="text-xs font-semibold text-[#7c6ff7] uppercase tracking-wide mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}
