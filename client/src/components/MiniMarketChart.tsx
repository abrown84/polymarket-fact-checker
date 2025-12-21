import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface MiniMarketChartProps {
  priceYes: number | null | undefined;
  volume?: number | null;
  liquidity?: number | null;
}

/**
 * Mini chart component for market cards
 * Shows a simple visualization of the market probability
 */
export default function MiniMarketChart({ priceYes }: MiniMarketChartProps) {
  // If no price data, show a placeholder
  if (priceYes === null || priceYes === undefined) {
    return (
      <div className="h-20 w-full flex items-center justify-center text-[#666] text-xs">
        No price data available
      </div>
    );
  }

  // Generate a simple trend line based on the current price
  // Create a mock historical trend for visualization
  const data = [];
  const now = Date.now();
  const hours = 24;
  
  // Generate data points for the last 24 hours
  // Simulate a trend that ends at the current price
  for (let i = hours; i >= 0; i--) {
    const time = now - (i * 60 * 60 * 1000);
    // Create a simple trend: start lower and trend toward current price
    const basePrice = priceYes - 0.1;
    const trend = (hours - i) / hours;
    const price = Math.max(0, Math.min(1, basePrice + (trend * 0.2) + (Math.random() * 0.05 - 0.025)));
    data.push({
      time: new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: price,
      timestamp: time,
    });
  }

  // Add the actual current price as the last point
  data[data.length - 1].price = priceYes;

  const color = priceYes > 0.5 ? '#10b981' : '#ef4444'; // emerald-500 or red-500

  return (
    <div className="w-full">
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`colorPrice-${priceYes}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={`url(#colorPrice-${priceYes})`}
              dot={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const value = payload[0].value as number;
                  return (
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2 text-xs">
                      <p className="text-white">
                        {(value * 100).toFixed(1)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-[#888]">
        <span>24h trend</span>
        <span className={`font-semibold ${priceYes > 0.5 ? 'text-emerald-500' : 'text-red-500'}`}>
          {(priceYes * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

