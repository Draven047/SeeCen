import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Phone, 
  TrendingUp, 
  Target, 
  Sparkles, 
  AlertCircle,
  Clock,
  Gift,
  Users,
  RefreshCw,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';

interface CallRecommendation {
  customerName: string;
  phone: string;
  reason: string;
  suggestedTime: string;
  talkingPoints: string[];
}

interface UrgentAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  customerName?: string;
  customerPhone?: string;
}

interface SalesTip {
  title: string;
  description: string;
  expectedImpact: string;
}

interface WeeklyGoal {
  goal: string;
  metric: string;
}

interface Recommendations {
  summary: string;
  urgentActions: UrgentAction[];
  callRecommendations: CallRecommendation[];
  salesTips: SalesTip[];
  weeklyGoals: WeeklyGoal[];
}

interface SalesContext {
  salespersonName: string;
  totalCustomers: number;
  customersWithNoRecentOrders: number;
  upcomingBirthdays: number;
  highValueCustomers: number;
  totalOrders: number;
  ordersThisMonth: number;
  totalRevenue: number;
  avgOrderValue: number;
  targetAmount: number;
  achievedAmount: number;
  targetProgress: number;
}

export default function SalesCoach() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [context, setContext] = useState<SalesContext | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sales-coach');
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data.recommendations);
      setContext(data.context);
      
      toast({
        title: 'Recommendations Ready',
        description: 'Your personalized sales coaching is ready!',
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get recommendations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" />
              AI Sales Coach
            </h1>
            <p className="text-muted-foreground mt-1">
              Get personalized recommendations to boost your sales performance
            </p>
          </div>
          <Button 
            onClick={fetchRecommendations} 
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Analyzing...' : 'Get AI Recommendations'}
          </Button>
        </div>

        {/* Initial State */}
        {!recommendations && !loading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Boost Your Sales?</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Click the button above to get AI-powered recommendations based on your customer data, 
                order history, and sales targets.
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Who to call
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  When to call
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  How to improve
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {recommendations && context && !loading && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{context.totalCustomers}</p>
                      <p className="text-xs text-muted-foreground">Total Customers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <AlertCircle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{context.customersWithNoRecentOrders}</p>
                      <p className="text-xs text-muted-foreground">Need Follow-up</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent">
                      <Gift className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{context.upcomingBirthdays}</p>
                      <p className="text-xs text-muted-foreground">Birthdays Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Target className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{context.targetProgress}%</p>
                      <p className="text-xs text-muted-foreground">Target Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">AI Analysis</h3>
                    <p className="text-muted-foreground">{recommendations.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Urgent Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    Urgent Actions
                  </CardTitle>
                  <CardDescription>High-priority items that need your attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {recommendations.urgentActions.map((action, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-sm">{action.title}</h4>
                            <Badge variant="outline" className={getPriorityColor(action.priority)}>
                              {action.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                          {action.customerPhone && (
                            <a 
                              href={`tel:${action.customerPhone}`}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {action.customerPhone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Call Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    Who to Call Today
                  </CardTitle>
                  <CardDescription>Prioritized list of customers to reach out to</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {recommendations.callRecommendations.map((call, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-medium text-sm">{call.customerName}</h4>
                              <a 
                                href={`tel:${call.phone}`}
                                className="text-xs text-primary hover:underline"
                              >
                                {call.phone}
                              </a>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {call.suggestedTime}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{call.reason}</p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-foreground">Talking Points:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {call.talkingPoints.map((point, j) => (
                                <li key={j} className="flex items-start gap-1">
                                  <span className="text-primary">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Sales Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-warning" />
                    Sales Tips
                  </CardTitle>
                  <CardDescription>Strategies to improve your performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {recommendations.salesTips.map((tip, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{tip.description}</p>
                          <div className="flex items-center gap-1 text-xs text-success">
                            <TrendingUp className="w-3 h-3" />
                            {tip.expectedImpact}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Weekly Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-success" />
                    Weekly Goals
                  </CardTitle>
                  <CardDescription>Focus areas for this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {recommendations.weeklyGoals.map((goal, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-full bg-success/10 mt-0.5">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{goal.goal}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Success metric:</span> {goal.metric}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
