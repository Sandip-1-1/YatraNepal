import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface TrafficToggleProps {
  showTraffic: boolean;
  onToggle: () => void;
}

export default function TrafficToggle({ showTraffic, onToggle }: TrafficToggleProps) {
  return (
    <Button
      variant={showTraffic ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      className="gap-2"
      data-testid="button-toggle-traffic"
    >
      <Activity className="w-4 h-4" />
      <span>Traffic</span>
      {showTraffic && (
        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
          ON
        </Badge>
      )}
    </Button>
  );
}
