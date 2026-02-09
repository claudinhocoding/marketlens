"use client";

interface MarketingIntel {
  target_personas?: string;
  pain_points?: string;
  company?: { id: string; name: string };
}

interface TargetingHeatmapProps {
  intel: MarketingIntel[];
  companies: { id: string; name: string }[];
}

export default function TargetingHeatmap({ intel, companies }: TargetingHeatmapProps) {
  const allPersonas = new Set<string>();
  const companyPersonas: Record<string, string[]> = {};

  intel.forEach((m) => {
    if (!m.company || !m.target_personas) return;
    try {
      const personas = JSON.parse(m.target_personas) as string[];
      companyPersonas[m.company.id] = personas;
      personas.forEach((p) => allPersonas.add(p));
    } catch {}
  });

  const personas = [...allPersonas];

  if (personas.length === 0) {
    return <p className="text-muted text-sm">No targeting data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted font-medium">Persona</th>
            {companies.map((c) => (
              <th key={c.id} className="text-center py-3 px-4 font-medium">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map((persona) => (
            <tr key={persona} className="border-b border-border/50 hover:bg-card-hover">
              <td className="py-2 px-4">{persona}</td>
              {companies.map((c) => {
                const targets = companyPersonas[c.id] || [];
                const match = targets.includes(persona);
                return (
                  <td key={c.id} className="text-center py-2 px-4">
                    <div className={`w-6 h-6 rounded mx-auto ${match ? "bg-accent" : "bg-border"}`} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
