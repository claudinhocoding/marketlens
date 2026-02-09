"use client";

interface Feature {
  name: string;
  category?: string;
  description?: string;
  company?: { id: string; name: string };
}

interface FeatureMatrixProps {
  features: Feature[];
  companies: { id: string; name: string }[];
}

export default function FeatureMatrix({ features, companies }: FeatureMatrixProps) {
  const categories = [...new Set(features.map((f) => f.category || "Uncategorized"))];
  const featuresByCategory = categories.map((cat) => ({
    category: cat,
    features: [...new Set(features.filter((f) => (f.category || "Uncategorized") === cat).map((f) => f.name))],
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted font-medium">Feature</th>
            {companies.map((c) => (
              <th key={c.id} className="text-center py-3 px-4 font-medium">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featuresByCategory.map(({ category, features: featureNames }) => (
            <>
              <tr key={category}>
                <td colSpan={companies.length + 1} className="py-2 px-4 text-xs font-semibold text-accent uppercase tracking-wider bg-card">
                  {category}
                </td>
              </tr>
              {featureNames.map((fname) => (
                <tr key={fname} className="border-b border-border/50 hover:bg-card-hover">
                  <td className="py-2 px-4">{fname}</td>
                  {companies.map((c) => {
                    const has = features.some((f) => f.name === fname && f.company?.id === c.id);
                    return (
                      <td key={c.id} className="text-center py-2 px-4">
                        {has ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
