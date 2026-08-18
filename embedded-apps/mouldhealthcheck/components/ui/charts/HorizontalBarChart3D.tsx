import React, { useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Polygon, Rect, G, Text as SvgText } from "react-native-svg";
import { chartPalette, colors, font } from "@/constants/theme";

export type HorizontalBarDatum = {
  label: string;
  values: number[];
};

type Props = {
  data: HorizontalBarDatum[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  animated?: boolean;
  style?: ViewStyle;
};

export default function HorizontalBarChart3D({
  data,
  height = 240,
  colors: palette = chartPalette,
  showLegend = true,
  animated = true,
  style,
}: Props) {
  const [chartWidth, setChartWidth] = useState(0);

  const max = Math.max(1, ...data.map((d) => d.values.reduce((sum, v) => sum + v, 0)));
  const depth = 12; // 3D extrusion depth
  const dx = depth;
  const dy = depth;
  
  // Layout spacing
  const gap = 16;
  const barAreaHeight = height - 20; // Leave space for bottom
  const barHeight = Math.max(16, (barAreaHeight - (data.length - 1) * gap) / Math.max(1, data.length));
  
  // Left padding for labels
  const labelWidth = 60;
  const availableWidth = Math.max(0, chartWidth - labelWidth - dx - 30); // 30px padding right

  return (
    <View style={[{ width: "100%", height }, style]} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
      {chartWidth > 0 && (
        <Svg width="100%" height={height}>
          {data.map((d, i) => {
            const h = barHeight;
            const y = i * (h + gap) + dy + 10;
            
            let currentX = labelWidth;
            const visibleSegments = d.values
              .map((val, si) => ({ val, si }))
              .filter(item => item.val > 0);
              
            const totalVal = d.values.reduce((a, b) => a + b, 0);

            return (
              <G key={`${d.label}-${i}`}>
                {/* Y-axis label */}
                <SvgText
                  x={labelWidth - 10}
                  y={y + h / 2 + 4}
                  fill={colors.textMuted}
                  fontSize={font.sub}
                  fontWeight={font.medium}
                  textAnchor="end"
                >
                  {d.label.length > 8 ? d.label.substring(0, 7) + ".." : d.label}
                </SvgText>

                {/* 3D Bar Segments */}
                {visibleSegments.map((item, index) => {
                  const { val, si } = item;
                  const valWidth = (val / max) * availableWidth;
                  const w = Math.max(4, valWidth); // Minimum visible width
                  const x = currentX;
                  const color = palette[si % palette.length];
                  
                  currentX += w;
                  const isLast = index === visibleSegments.length - 1;

                  return (
                    <G key={si}>
                      {/* Top Face */}
                      <Polygon
                        points={`
                          ${x},${y} 
                          ${x + dx},${y - dy} 
                          ${x + w + dx},${y - dy} 
                          ${x + w},${y}
                        `}
                        fill={color}
                      />
                      <Polygon
                        points={`
                          ${x},${y} 
                          ${x + dx},${y - dy} 
                          ${x + w + dx},${y - dy} 
                          ${x + w},${y}
                        `}
                        fill="#ffffff"
                        fillOpacity={0.25} // Lighten for top face
                      />

                      {/* Side Face (Right) - Only draw for the last segment to cap the 3D block */}
                      {isLast && (
                        <G>
                          <Polygon
                            points={`
                              ${x + w},${y} 
                              ${x + w + dx},${y - dy} 
                              ${x + w + dx},${y + h - dy} 
                              ${x + w},${y + h}
                            `}
                            fill={color}
                          />
                          <Polygon
                            points={`
                              ${x + w},${y} 
                              ${x + w + dx},${y - dy} 
                              ${x + w + dx},${y + h - dy} 
                              ${x + w},${y + h}
                            `}
                            fill="#000000"
                            fillOpacity={0.15} // Darken for side face
                          />
                        </G>
                      )}

                      {/* Front Face */}
                      <Rect x={x} y={y} width={w} height={h} fill={color} />
                    </G>
                  );
                })}
                
                {/* Total Value Label on the right of the bar */}
                {totalVal > 0 && (
                  <SvgText
                    x={currentX + dx + 8}
                    y={y + h / 2 + 4 - dy / 2}
                    fill={colors.textBody}
                    fontSize={font.micro}
                    fontWeight={font.medium}
                  >
                    {totalVal}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
