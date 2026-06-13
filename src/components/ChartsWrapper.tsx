"use client";
import { BarChartView, PieChartView } from "./Charts";

export function BarChartWrapper({ data }: { data: any[] }) {
  return <BarChartView data={data} />;
}

export function PieChartWrapper({ data }: { data: any[] }) {
  return <PieChartView data={data} />;
}
