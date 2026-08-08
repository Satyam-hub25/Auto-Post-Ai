import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "../ui/Card";
interface TopSourcesChartProps {
  data: { source: string; count: number }[];
}
export function TopSourcesChart({ data }: TopSourcesChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        
        <h3 className="text-lg font-extrabold text-white tracking-wide mb-4">
          Top Discovery Sources
        </h3>
        <p className="text-white text-sm">No source data available yet.</p>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      
      <h3 className="text-lg font-extrabold text-white tracking-wide mb-6">
        Top Discovery Sources
      </h3>
      <div className="h-[300px] w-full">
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 0, left: 20, bottom: 0 }}
          >
            
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={false}
              stroke="currentColor"
              className="text-gray-200"
            />
            <XAxis type="number" hide />
            <YAxis
              dataKey="source"
              type="category"
              axisLine={false}
              tickLine={false}
              className="text-white text-xs"
              width={120}
            />
            <Tooltip
              cursor={{ fill: "rgba(6, 182, 212, 0.1)" }}
              contentStyle={{
                backgroundColor: "rgba(15, 22, 41, 0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Bar
              dataKey="count"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
