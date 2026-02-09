"use client";

interface SocialProfile {
  id: string;
  platform: string;
  followers_count?: number;
  url: string;
}

const platformIcons: Record<string, string> = {
  "LinkedIn": "💼",
  "Twitter/X": "𝕏",
  "YouTube": "▶️",
  "Facebook": "📘",
  "GitHub": "🐙",
};

export default function SocialFollowers({ profiles }: { profiles: SocialProfile[] }) {
  if (!profiles || profiles.length === 0) {
    return <p className="text-muted text-sm">No social profiles detected.</p>;
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted font-medium">Platform</th>
            <th className="text-right py-3 px-4 text-muted font-medium">Followers</th>
            <th className="text-right py-3 px-4 text-muted font-medium">Link</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-border/50 hover:bg-card-hover">
              <td className="py-2 px-4">
                <span className="mr-2">{platformIcons[p.platform] || "🔗"}</span>
                {p.platform}
              </td>
              <td className="py-2 px-4 text-right text-muted">
                {p.followers_count != null ? p.followers_count.toLocaleString() : "—"}
              </td>
              <td className="py-2 px-4 text-right">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">
                  Visit ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
