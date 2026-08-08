import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "../ui/Card";
interface AcceptanceRateChartProps {
  accepted: number;
  rejected: number;
}
export function AcceptanceRateChart({
  accepted,
  rejected,
}: AcceptanceRateChartProps) {
  const data = [
    { name: "Accepted", value: accepted },
    { name: "Rejected", value: rejected },
  ];
  const COLORS = ["#06b6d4", "#f43f5e"];
  return (
    <Card className="p-6 flex flex-col">
      
      <h3 className="text-lg font-extrabold text-white tracking-wide mb-2">
        Acceptance Rate
      </h3>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 22, 41, 0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
