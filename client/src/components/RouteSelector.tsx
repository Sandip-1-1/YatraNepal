import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Route } from '@shared/schema';

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onSelectRoute: (routeId: string | null) => void;
}

export default function RouteSelector({ routes, selectedRoute, onSelectRoute }: RouteSelectorProps) {
  return (
    <Select
      value={selectedRoute?.id || 'all'}
      onValueChange={(value) => onSelectRoute(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-64" data-testid="select-route">
        <SelectValue placeholder="Select a route" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" data-testid="option-all-routes">
          All Routes
        </SelectItem>
        {routes.map((route) => (
          <SelectItem key={route.id} value={route.id} data-testid={`option-route-${route.id}`}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              <span>{route.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
