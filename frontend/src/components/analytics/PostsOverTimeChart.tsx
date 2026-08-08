import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "../ui/Card";
import { format, parseISO } from "date-fns";
interface PostsOverTimeChartProps {
  data: { date: string; count: number }[];
}
export function PostsOverTimeChart({ data }: PostsOverTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        
        <h3 className="text-lg font-extrabold text-white tracking-wide mb-4">
          Posting Activity
        </h3>
        <p className="text-white text-sm">
          No posting data available yet.
        </p>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      
      <h3 className="text-lg font-extrabold text-white tracking-wide mb-6">
        Posting Activity
      </h3>
      <div className="h-[300px] w-full">
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            
            <defs>
              
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-gray-200"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => format(parseISO(val), "MMM d")}
              stroke="currentColor"
              className="text-white text-xs"
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="currentColor"
              className="text-white text-xs"
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 22, 41, 0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
              itemStyle={{ color: "#06b6d4" }}
              labelFormatter={(val) =>
                format(parseISO(val as string), "MMM d, yyyy")
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#06b6d4"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
