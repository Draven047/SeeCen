import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
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
  CheckCircle2,
  Package,
  CalendarIcon,
  MessageCircle,
  ChevronRight,
  Percent,
  ShoppingBag
} from 'lucide-react';

interface Recommendations {
  dailySummary: string;
  cigarsToSell: Array<{
    cigarName: string;
    reason: string;
    suggestedCustomers: string[];
    pitchLine: string;
    urgency: string;
  }>;
  followUpCustomers: Array<{
    customerName: string;
    phone: string;
    reason: string;
    lastOrderDaysAgo: number;
    suggestedProducts: string[];
    messageTemplate: string;
    priority: string;
  }>;
  crossSellOpportunities: Array<{
    customerName: string;
    currentPreference: string;
    suggestedProduct: string;
    pitchReason: string;
    discount: string;
  }>;
  offerRecommendations: Array<{
    offerType: string;
    targetCustomers: string;
    description: string;
    validReason: string;
  }>;
  incentiveCoaching: {
    currentProgress: string;
    remainingAmount: string;
    daysLeft: number;
    dailyNeeded: string;
    motivationalTip: string;
    nextMilestone: string;
  };
  stockPriorities: Array<{
    cigarName: string;
    currentStock: number;
    action: string;
    reason: string;
  }>;
  weeklyGoals: Array<{
    goal: string;
    metric: string;
    deadline: string;
  }>;
}

interface SalesContext {
  salespersonName: string;
  totalCustomers: number;
  customersNeedingFollowUp: number;
  upcomingBirthdaysCount: number;
  highValueCustomersCount: number;
  totalOrders: number;
  ordersThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgOrderValue: number;
  targetAmount: number;
  achievedAmount: number;
  targetProgress: string | number;
  remainingToTarget: number;
  daysLeftInQuarter: number;
  dailyTargetNeeded: number;
}

interface DailyRecommendation {
  id: string;
  recommendation_date: string;
  daily_summary: string;
  cigars_to_push: any;
  follow_up_customers: any;
  cross_sell_opportunities: any;
  offer_recommendations: any;
  incentive_coaching: any;
  stock_priorities: any;
  analysis_context: any;
  created_at: string;
  updated_at: string;
}

export default function AICoachPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [context, setContext] = useState<SalesContext | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [history, setHistory] = useState<DailyRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    if (user) {
      fetchTodayRecommendations();
      fetchHistory();
    }
  }, [user]);

  const fetchTodayRecommendations = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('ai_coach_daily_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('recommendation_date', today)
      .maybeSingle();

    if (data) {
      loadRecommendationFromData(data as DailyRecommendation);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    
    const { data } = await supabase
      .from('ai_coach_daily_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .order('recommendation_date', { ascending: false })
      .limit(30);

    if (data) {
      setHistory(data as DailyRecommendation[]);
    }
    setHistoryLoading(false);
  };

  const loadRecommendationFromData = (data: DailyRecommendation) => {
    setRecommendations({
      dailySummary: data.daily_summary || '',
      cigarsToSell: data.cigars_to_push || [],
      followUpCustomers: data.follow_up_customers || [],
      crossSellOpportunities: data.cross_sell_opportunities || [],
      offerRecommendations: data.offer_recommendations || [],
      incentiveCoaching: data.incentive_coaching || {},
      stockPriorities: data.stock_priorities || [],
      weeklyGoals: []
    });
    setContext(data.analysis_context as SalesContext);
  };

  const fetchRecommendationsForDate = async (date: Date) => {
    if (!user) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const { data } = await supabase
      .from('ai_coach_daily_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('recommendation_date', dateStr)
      .maybeSingle();

    if (data) {
      loadRecommendationFromData(data as DailyRecommendation);
      setSelectedDate(date);
    } else {
      toast({
        title: 'No Data',
        description: `No recommendations found for ${format(date, 'MMM d, yyyy')}`,
        variant: 'destructive'
      });
    }
  };

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-generate');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setRecommendations(data.recommendations);
      setContext(data.context);
      setSelectedDate(new Date());
      await fetchHistory();
      
      toast({
        title: 'Recommendations Ready',
        description: 'Your personalized AI coaching is ready!',
      });
    } catch (error) {
      console.error('Error:', error);
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
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const historyDates = history.map(h => parseISO(h.recommendation_date));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" />
              AI Sales Coach
            </h1>
            <p className="text-muted-foreground mt-1">
              Your intelligent daily partner for sales success
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(selectedDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && fetchRecommendationsForDate(date)}
                  disabled={(date) => date > new Date()}
                  modifiers={{ hasData: historyDates }}
                  modifiersStyles={{ hasData: { fontWeight: 'bold', textDecoration: 'underline' } }}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={generateRecommendations} disabled={loading} className="gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate Today\'s Advice'}
            </Button>
          </div>
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
                Click "Generate Today's Advice" to get AI-powered recommendations based on your customers, orders, inventory, and targets.
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Package className="w-4 h-4" /> What to sell</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Who to call</div>
                <div className="flex items-center gap-2"><Target className="w-4 h-4" /> Hit your targets</div>
                <div className="flex items-center gap-2"><Percent className="w-4 h-4" /> Best offers</div>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="today">Today's Plan</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="targets">Targets</TabsTrigger>
            </TabsList>

            {/* Today's Plan Tab */}
            <TabsContent value="today" className="space-y-6">
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
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{context.customersNeedingFollowUp}</p>
                        <p className="text-xs text-muted-foreground">Need Follow-up</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-pink-500/10">
                        <Gift className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{context.upcomingBirthdaysCount}</p>
                        <p className="text-xs text-muted-foreground">Birthdays Soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Target className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{context.targetProgress}%</p>
                        <p className="text-xs text-muted-foreground">Target Progress</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Summary */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Today's AI Summary</h3>
                      <p className="text-muted-foreground">{recommendations.dailySummary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Actions Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Top Cigars to Sell */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Top Cigars to Sell Today
                    </CardTitle>
                    <CardDescription>Prioritized by demand, stock, and margin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[280px] pr-4">
                      <div className="space-y-3">
                        {recommendations.cigarsToSell?.slice(0, 5).map((cigar, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm">{cigar.cigarName}</h4>
                              <Badge variant="outline" className={getUrgencyColor(cigar.urgency)}>
                                {cigar.urgency}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{cigar.reason}</p>
                            <div className="bg-muted/50 p-2 rounded text-xs italic">
                              "{cigar.pitchLine}"
                            </div>
                            {cigar.suggestedCustomers?.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <span className="font-medium">Suggest to:</span> {cigar.suggestedCustomers.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                        {(!recommendations.cigarsToSell || recommendations.cigarsToSell.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-8">No specific recommendations</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Priority Follow-ups */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      Priority Follow-ups
                    </CardTitle>
                    <CardDescription>Customers to contact today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[280px] pr-4">
                      <div className="space-y-3">
                        {recommendations.followUpCustomers?.slice(0, 5).map((customer, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="font-medium text-sm">{customer.customerName}</h4>
                                <a href={`tel:${customer.phone}`} className="text-xs text-primary hover:underline">
                                  {customer.phone}
                                </a>
                              </div>
                              <Badge variant="outline" className={getPriorityColor(customer.priority)}>
                                {customer.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{customer.reason}</p>
                            {customer.lastOrderDaysAgo && (
                              <p className="text-xs text-muted-foreground">
                                Last order: {customer.lastOrderDaysAgo} days ago
                              </p>
                            )}
                            {customer.messageTemplate && (
                              <div className="bg-muted/50 p-2 rounded text-xs mt-2 italic">
                                "{customer.messageTemplate}"
                              </div>
                            )}
                          </div>
                        ))}
                        {(!recommendations.followUpCustomers || recommendations.followUpCustomers.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-8">All caught up!</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Cross-sell Opportunities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-purple-500" />
                      Cross-sell Opportunities
                    </CardTitle>
                    <CardDescription>Upgrade existing customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-3">
                        {recommendations.crossSellOpportunities?.map((opp, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <h4 className="font-medium text-sm mb-1">{opp.customerName}</h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              Usually buys: {opp.currentPreference}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <ChevronRight className="w-3 h-3" />
                              <span className="font-medium text-primary">{opp.suggestedProduct}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{opp.pitchReason}</p>
                            {opp.discount && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                <Percent className="w-3 h-3 mr-1" />
                                {opp.discount}
                              </Badge>
                            )}
                          </div>
                        ))}
                        {(!recommendations.crossSellOpportunities || recommendations.crossSellOpportunities.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-8">No cross-sell opportunities</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Offer Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-500" />
                      Offer Recommendations
                    </CardTitle>
                    <CardDescription>Deals to pitch today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-3">
                        {recommendations.offerRecommendations?.map((offer, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">{offer.offerType}</Badge>
                            </div>
                            <p className="text-sm font-medium mb-1">{offer.description}</p>
                            <p className="text-xs text-muted-foreground mb-1">
                              <span className="font-medium">For:</span> {offer.targetCustomers}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Why now:</span> {offer.validReason}
                            </p>
                          </div>
                        ))}
                        {(!recommendations.offerRecommendations || recommendations.offerRecommendations.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-8">No special offers today</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Stock Priorities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-red-500" />
                      Stock Priorities
                    </CardTitle>
                    <CardDescription>Items needing attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-3">
                        {recommendations.stockPriorities?.map((item, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm">{item.cigarName}</h4>
                              <Badge variant="outline" className="text-xs">
                                {item.currentStock} left
                              </Badge>
                            </div>
                            <p className="text-xs font-medium text-amber-600 mb-1">{item.action}</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                        ))}
                        {(!recommendations.stockPriorities || recommendations.stockPriorities.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-8">All stock levels healthy</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* All Cigars to Sell */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      All Recommended Cigars
                    </CardTitle>
                    <CardDescription>Full list of today's recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-3">
                        {recommendations.cigarsToSell?.map((cigar, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm">{cigar.cigarName}</h4>
                              <Badge variant="outline" className={getUrgencyColor(cigar.urgency)}>
                                {cigar.urgency}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{cigar.reason}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Targets Tab */}
            <TabsContent value="targets" className="space-y-6">
              {/* Incentive Coaching Card */}
              {recommendations.incentiveCoaching && (
                <Card className="bg-gradient-to-br from-green-500/5 to-amber-500/5 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-500" />
                      Your Path to Target
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-primary">{recommendations.incentiveCoaching.currentProgress}</p>
                        <p className="text-sm text-muted-foreground">Current Progress</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-amber-500">₹{recommendations.incentiveCoaching.remainingAmount}</p>
                        <p className="text-sm text-muted-foreground">Remaining to Target</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-green-500">{recommendations.incentiveCoaching.daysLeft}</p>
                        <p className="text-sm text-muted-foreground">Days Left</p>
                      </div>
                    </div>
                    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm mb-1">Daily Target: ₹{recommendations.incentiveCoaching.dailyNeeded}</p>
                          <p className="text-sm text-muted-foreground">{recommendations.incentiveCoaching.motivationalTip}</p>
                          {recommendations.incentiveCoaching.nextMilestone && (
                            <p className="text-sm text-primary mt-2 font-medium">
                              🎯 {recommendations.incentiveCoaching.nextMilestone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Goals */}
              {recommendations.weeklyGoals && recommendations.weeklyGoals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Weekly Goals
                    </CardTitle>
                    <CardDescription>Focus areas for this week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.weeklyGoals.map((goal, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-full bg-green-500/10 mt-0.5">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{goal.goal}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Measure:</span> {goal.metric}
                              </p>
                              {goal.deadline && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">By:</span> {goal.deadline}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">₹{context.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">₹{context.revenueThisMonth.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">This Month</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{context.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Total Orders</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">₹{context.avgOrderValue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Avg Order Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
