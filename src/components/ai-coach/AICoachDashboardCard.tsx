import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Sparkles, 
  Phone, 
  Target, 
  TrendingUp,
  ChevronRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface DailyRecommendation {
  id: string;
  recommendation_date: string;
  daily_summary: string;
  cigars_to_push: any[];
  follow_up_customers: any[];
  incentive_coaching: any;
  analysis_context: any;
  updated_at: string;
}

export function AICoachDashboardCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<DailyRecommendation | null>(null);

  useEffect(() => {
    if (user) fetchTodayRecommendation();
  }, [user]);

  const fetchTodayRecommendation = async () => {
    if (!user) return;
    setLoading(true);
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('ai_coach_daily_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('recommendation_date', today)
      .maybeSingle();

    if (!error && data) {
      setRecommendation(data as DailyRecommendation);
    }
    setLoading(false);
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-generate');
      if (!error && data?.recommendations) {
        await fetchTodayRecommendation();
      }
    } catch (error) {
      console.error('Failed to generate:', error);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="col-span-full bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Sales Coach</h3>
                <p className="text-sm text-muted-foreground">Get your daily personalized recommendations</p>
              </div>
            </div>
            <Button onClick={generateRecommendations} disabled={generating} className="gap-2">
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Get Today\'s Recommendations'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cigarsToSell = (recommendation.cigars_to_push as any[]) || [];
  const followUps = (recommendation.follow_up_customers as any[]) || [];
  const incentive = recommendation.incentive_coaching as any;

  return (
    <Card className="col-span-full bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 border-primary/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">Today's AI Coach Summary</h3>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(recommendation.updated_at), 'h:mm a')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{recommendation.daily_summary}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/ai-coach')} className="gap-1 shrink-0">
            Full Recommendations
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cigars to Sell */}
          <div className="p-4 rounded-xl bg-background/50 border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Top Cigars to Sell</span>
            </div>
            <div className="space-y-1">
              {cigarsToSell.slice(0, 2).map((c, i) => (
                <div key={i} className="text-sm font-medium truncate">{c.cigarName}</div>
              ))}
              {cigarsToSell.length === 0 && <span className="text-sm text-muted-foreground">No suggestions</span>}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="p-4 rounded-xl bg-background/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Follow-ups Today</span>
            </div>
            <div className="space-y-1">
              {followUps.slice(0, 2).map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{c.customerName}</span>
                  {c.priority === 'high' && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                </div>
              ))}
              {followUps.length === 0 && <span className="text-sm text-muted-foreground">All caught up!</span>}
            </div>
          </div>

          {/* Target Progress */}
          <div className="p-4 rounded-xl bg-background/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Target Progress</span>
            </div>
            {incentive ? (
              <div>
                <div className="text-lg font-bold">{incentive.currentProgress || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">{incentive.daysLeft} days left</div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No target set</span>
            )}
          </div>

          {/* Daily Needed */}
          <div className="p-4 rounded-xl bg-background/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Daily Goal</span>
            </div>
            {incentive?.dailyNeeded ? (
              <div>
                <div className="text-lg font-bold">₹{incentive.dailyNeeded}</div>
                <div className="text-xs text-muted-foreground">to stay on track</div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">On track!</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
