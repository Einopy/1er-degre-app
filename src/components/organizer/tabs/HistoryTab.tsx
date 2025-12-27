import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Edit,
  UserPlus,
  UserMinus,
  DollarSign,
  Mail,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchWorkshopHistory, type HistoryLog } from '@/services/workshop-changes';

interface HistoryTabProps {
  workshopId: string;
  refreshTrigger?: number;
}

export function HistoryTab({ workshopId, refreshTrigger }: HistoryTabProps) {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        console.log('[HistoryTab] Loading history for workshop:', workshopId);
        setIsLoading(true);
        setError(null);
        const history = await fetchWorkshopHistory(workshopId);
        console.log('[HistoryTab] Loaded history:', history);
        setLogs(history);
      } catch (err) {
        console.error('[HistoryTab] Failed to load workshop history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [workshopId, refreshTrigger]);

  const getLogIcon = (logType: HistoryLog['log_type']) => {
    const icons: Record<HistoryLog['log_type'], any> = {
      status_change: AlertCircle,
      field_edit: Edit,
      participant_add: UserPlus,
      participant_remove: UserMinus,
      participant_reinscribe: UserPlus,
      refund: DollarSign,
      email_sent: Mail,
      date_change: Calendar,
      location_change: MapPin,
    };
    return icons[logType] || AlertCircle;
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Erreur lors du chargement de l'historique: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun historique disponible pour cet atelier
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              L'historique sera créé lorsque vous effectuerez des modifications ou des actions sur l'atelier
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log) => {
              const Icon = getLogIcon(log.log_type);
              const date = format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr });

              return (
                <Card key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">{log.description}</p>
                    </div>
                    <div className="shrink-0 text-right ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{date}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
