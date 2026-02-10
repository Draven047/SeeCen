import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating AI coach recommendations for user:', user.id);

    // Fetch comprehensive salesperson data
    const [
      { data: customers },
      { data: orders },
      { data: salesTargets },
      { data: profile },
      { data: cigars },
      { data: storeInventory }
    ] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('orders').select('*, order_items(*, cigars(*))').eq('created_by', user.id),
      supabase.from('sales_targets').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('cigars').select('*'),
      supabase.from('store_inventory').select('*, cigars(*), stores(*)')
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Analyze customers needing follow-up
    const customersNeedingFollowUp = customers?.filter(c => {
      if (!c.last_order_date) return true;
      return new Date(c.last_order_date) < thirtyDaysAgo;
    }).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      lastOrderDate: c.last_order_date,
      daysSinceLastOrder: c.last_order_date 
        ? Math.floor((now.getTime() - new Date(c.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      fumePoints: c.fume_points_balance || 0,
      totalSpent: (c.imported_total_spent || 0),
      isHighValue: (c.fume_points_balance || 0) >= 500 || (c.imported_total_spent || 0) >= 50000
    })).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 10) || [];

    // Upcoming birthdays (next 14 days)
    const upcomingBirthdays = customers?.filter(c => {
      if (!c.date_of_birth) return false;
      const dob = new Date(c.date_of_birth);
      const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      const nextYearBday = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
      const daysUntilThis = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilNext = Math.ceil((nextYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return (daysUntilThis >= 0 && daysUntilThis <= 14) || (daysUntilNext >= 0 && daysUntilNext <= 14);
    }).map(c => {
      const dob = new Date(c.date_of_birth);
      const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      let daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        const nextYearBday = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
        daysUntil = Math.ceil((nextYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        birthday: c.date_of_birth,
        daysUntil,
        fumePoints: c.fume_points_balance || 0
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5) || [];

    // Analyze order patterns
    const ordersByCustomer: Record<string, any[]> = {};
    orders?.forEach(o => {
      if (o.customer_id) {
        if (!ordersByCustomer[o.customer_id]) ordersByCustomer[o.customer_id] = [];
        ordersByCustomer[o.customer_id].push(o);
      }
    });

    // Find repeat customers and their preferences
    const customerPreferences: Record<string, { cigars: Record<string, number>, avgInterval: number }> = {};
    Object.entries(ordersByCustomer).forEach(([customerId, customerOrders]) => {
      if (customerOrders.length >= 2) {
        const sortedOrders = customerOrders.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        let totalInterval = 0;
        for (let i = 1; i < sortedOrders.length; i++) {
          totalInterval += new Date(sortedOrders[i].created_at).getTime() - new Date(sortedOrders[i-1].created_at).getTime();
        }
        const avgInterval = Math.floor(totalInterval / (sortedOrders.length - 1) / (1000 * 60 * 60 * 24));
        
        const cigarPrefs: Record<string, number> = {};
        customerOrders.forEach(o => {
          o.order_items?.forEach((item: any) => {
            if (item.cigars?.name) {
              cigarPrefs[item.cigars.name] = (cigarPrefs[item.cigars.name] || 0) + item.quantity;
            }
          });
        });
        
        customerPreferences[customerId] = { cigars: cigarPrefs, avgInterval };
      }
    });

    // Identify customers due for reorder
    const customersDueForReorder = Object.entries(customerPreferences)
      .map(([customerId, prefs]) => {
        const customer = customers?.find(c => c.id === customerId);
        if (!customer?.last_order_date) return null;
        const daysSinceLastOrder = Math.floor((now.getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 60 * 60 * 24));
        const overdue = daysSinceLastOrder >= prefs.avgInterval;
        return {
          customer,
          avgInterval: prefs.avgInterval,
          daysSinceLastOrder,
          overdue,
          favoriteCigars: Object.entries(prefs.cigars).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name)
        };
      })
      .filter(c => c && c.overdue)
      .slice(0, 5);

    // Calculate sales metrics
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    const currentTarget = salesTargets?.find(t => t.quarter === currentQuarter && t.year === currentYear);
    
    const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0) || 0;
    const avgOrderValue = orders?.length ? totalRevenue / orders.length : 0;
    const ordersThisMonth = orders?.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }) || [];
    const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);

    // Analyze inventory for stock priorities
    const lowStockCigars = cigars?.filter(c => (c.stock_quantity || 0) <= 10 && c.stock_status !== 'out_of_stock')
      .map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        stockQuantity: c.stock_quantity,
        origin: c.origin,
        wrapper: c.wrapper
      })).slice(0, 5) || [];

    // Find high-margin cigars (proxy: higher priced cigars)
    const premiumCigars = cigars?.filter(c => c.stock_quantity && c.stock_quantity > 0)
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        origin: c.origin,
        wrapper: c.wrapper,
        description: c.description?.substring(0, 100)
      })) || [];

    // Calculate incentive progress
    const targetAmount = currentTarget?.target_amount || 50000;
    const achievedAmount = currentTarget?.achieved_amount || totalRevenue;
    const remainingToTarget = Math.max(0, targetAmount - achievedAmount);
    const daysLeftInQuarter = getDaysLeftInQuarter(now);
    const dailyTargetNeeded = daysLeftInQuarter > 0 ? remainingToTarget / daysLeftInQuarter : 0;

    // Build comprehensive context
    const salesContext = {
      salespersonName: profile?.full_name || 'Salesperson',
      currentDate: now.toISOString().split('T')[0],
      
      // Customer metrics
      totalCustomers: customers?.length || 0,
      customersNeedingFollowUp: customersNeedingFollowUp.length,
      upcomingBirthdaysCount: upcomingBirthdays.length,
      highValueCustomersCount: customers?.filter(c => (c.fume_points_balance || 0) >= 500).length || 0,
      
      // Sales metrics
      totalOrders: orders?.length || 0,
      ordersThisMonth: ordersThisMonth.length,
      totalRevenue,
      revenueThisMonth,
      avgOrderValue: Math.round(avgOrderValue),
      
      // Target & incentives
      targetAmount,
      achievedAmount,
      targetProgress: targetAmount > 0 ? ((achievedAmount / targetAmount) * 100).toFixed(1) : 0,
      remainingToTarget,
      daysLeftInQuarter,
      dailyTargetNeeded: Math.round(dailyTargetNeeded),
      incentiveMilestone: currentTarget?.incentive_milestone,
      
      // Inventory
      lowStockCigarsCount: lowStockCigars.length,
      totalCigarsInCatalogue: cigars?.length || 0,
      
      // Detailed data for AI
      followUpCustomers: customersNeedingFollowUp,
      birthdayCustomers: upcomingBirthdays,
      reorderDueCustomers: customersDueForReorder,
      lowStockItems: lowStockCigars,
      premiumCigarsToSell: premiumCigars
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert AI Sales Coach for Cigatrax, a premium cigar store management system. Your role is to provide highly personalized, actionable, data-driven recommendations to help salespersons maximize their sales performance.

Today's date is ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Analyze the salesperson's data comprehensively and provide recommendations in this exact JSON format:
{
  "dailySummary": "A motivational 2-3 sentence summary of today's priorities and opportunities",
  
  "cigarsToSell": [
    {
      "cigarName": "Name of cigar",
      "reason": "Why this cigar today (stock urgency, high margin, trending, etc)",
      "suggestedCustomers": ["Customer names who might like it"],
      "pitchLine": "A quick sales pitch for this cigar",
      "urgency": "high|medium|low"
    }
  ],
  
  "followUpCustomers": [
    {
      "customerName": "Name",
      "phone": "Phone number",
      "reason": "Specific reason to follow up",
      "lastOrderDaysAgo": number,
      "suggestedProducts": ["Based on their history"],
      "messageTemplate": "A ready-to-use message/script",
      "priority": "high|medium|low"
    }
  ],
  
  "crossSellOpportunities": [
    {
      "customerName": "Name",
      "currentPreference": "What they usually buy",
      "suggestedProduct": "What to cross-sell",
      "pitchReason": "Why they'd like it",
      "discount": "Suggested offer if any"
    }
  ],
  
  "offerRecommendations": [
    {
      "offerType": "Type of offer (bundle, discount, loyalty, etc)",
      "targetCustomers": "Who it's for",
      "description": "Offer details",
      "validReason": "Why this offer works now (festival, inventory, retention)"
    }
  ],
  
  "incentiveCoaching": {
    "currentProgress": "Progress summary",
    "remainingAmount": "Amount left to target",
    "daysLeft": number,
    "dailyNeeded": "Daily sales needed",
    "motivationalTip": "Encouragement and strategy",
    "nextMilestone": "What happens when they hit target"
  },
  
  "stockPriorities": [
    {
      "cigarName": "Name",
      "currentStock": number,
      "action": "Pitch urgently / Reorder soon / Feature in offers",
      "reason": "Why prioritize"
    }
  ],
  
  "weeklyGoals": [
    {
      "goal": "Specific measurable goal",
      "metric": "How to measure",
      "deadline": "By when"
    }
  ]
}

Key considerations:
- Currency is Indian Rupees (₹)
- Be specific with customer names and phone numbers from the data
- Prioritize high-value customers and those overdue for reorders
- Consider upcoming birthdays as relationship-building opportunities
- Low stock items need urgent pitching before they run out
- Seasonal context matters (festivals like Diwali, New Year, etc.)
- Keep pitches and messages professional yet warm
- Focus on the top 3-5 items in each category for actionability`;

    const userPrompt = `Here is my complete sales data for today:

${JSON.stringify(salesContext, null, 2)}

Based on this data, give me my personalized daily coaching recommendations. Be specific with names, numbers, and actionable advice. Focus on what I should prioritize TODAY to maximize sales and hit my targets.`;

    console.log('Calling Lovable AI for comprehensive recommendations...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Unable to generate recommendations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return new Response(JSON.stringify({ error: 'No response from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse AI response
    let recommendations;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        aiResponse.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      recommendations = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to process AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store recommendations in database
    const today = now.toISOString().split('T')[0];
    const { error: upsertError } = await supabaseAdmin
      .from('ai_coach_daily_recommendations')
      .upsert({
        user_id: user.id,
        recommendation_date: today,
        cigars_to_push: recommendations.cigarsToSell || [],
        follow_up_customers: recommendations.followUpCustomers || [],
        cross_sell_opportunities: recommendations.crossSellOpportunities || [],
        offer_recommendations: recommendations.offerRecommendations || [],
        incentive_coaching: recommendations.incentiveCoaching || {},
        stock_priorities: recommendations.stockPriorities || [],
        daily_summary: recommendations.dailySummary || '',
        analysis_context: salesContext,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,recommendation_date'
      });

    if (upsertError) {
      console.error('Failed to store recommendations:', upsertError);
    }

    return new Response(JSON.stringify({
      recommendations,
      context: salesContext,
      generatedAt: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-coach-generate:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate recommendations' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDaysLeftInQuarter(date: Date): number {
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3);
  const quarterEndMonth = (quarter + 1) * 3;
  const quarterEnd = new Date(year, quarterEndMonth, 0);
  return Math.ceil((quarterEnd.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}
