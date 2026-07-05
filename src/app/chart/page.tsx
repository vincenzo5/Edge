import StockApp from "../components/StockApp";
import ModuleRouteTracker from "../components/home/ModuleRouteTracker";

export default function ChartPage() {
  return (
    <>
      <ModuleRouteTracker module="chart" />
      <StockApp />
    </>
  );
}
