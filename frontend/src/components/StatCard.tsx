interface StatCardProps {
  label: string;
  value: number;
  tone?: "slate" | "violet" | "cyan" | "emerald";
}

export default function StatCard({ label, value, tone = "slate" }: StatCardProps) {
  const toneMap = {
    slate: "bg-slate-900 text-white",
    violet: "bg-violet-600 text-white",
    cyan: "bg-cyan-600 text-white",
    emerald: "bg-emerald-600 text-white",
  };
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
