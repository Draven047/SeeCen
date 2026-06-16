import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      console.error('JWT validation error:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = { id: data.claims.sub as string };

    // Fetch salesperson's data
    const [
      { data: customers },
      { data: orders },
      { data: salesTargets },
      { data: profile }
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('created_by', user.id),
      supabase.from('orders').select('*, order_items(*)').eq('created_by', user.id),
      supabase.from('sales_targets').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ]);

    // Analyze customer data
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const customersWithNoRecentOrders = customers?.filter(c => {
      if (!c.last_order_date) return true;
      return new Date(c.last_order_date) < thirtyDaysAgo;
    }) || [];

    const upcomingBirthdays = customers?.filter(c => {
      if (!c.date_of_birth) return false;
      const dob = new Date(c.date_of_birth);
      const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 14;
    }) || [];

    const highValueCustomers = customers?.filter(c => (c.fume_points_balance || 0) >= 500) || [];

    // Calculate sales metrics
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    const currentTarget = salesTargets?.find(t => t.quarter === currentQuarter && t.year === currentYear);
    
    const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0) || 0;
    const avgOrderValue = orders?.length ? totalRevenue / orders.length : 0;
    const ordersThisMonth = orders?.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }).length || 0;

    // Prepare context for AI
    const salesContext = {
      salespersonName: profile?.full_name || 'Salesperson',
      totalCustomers: customers?.length || 0,
      customersWithNoRecentOrders: customersWithNoRecentOrders.length,
      upcomingBirthdays: upcomingBirthdays.length,
      highValueCustomers: highValueCustomers.length,
      totalOrders: orders?.length || 0,
      ordersThisMonth,
      totalRevenue,
      avgOrderValue,
      targetAmount: currentTarget?.target_amount || 0,
      achievedAmount: currentTarget?.achieved_amount || 0,
      targetProgress: currentTarget ? ((currentTarget.achieved_amount / currentTarget.target_amount) * 100).toFixed(1) : 0,
      customersNeedingFollowUp: customersWithNoRecentOrders.slice(0, 5).map(c => ({
        name: c.name,
        phone: c.phone,
        lastOrder: c.last_order_date,
        fumePoints: c.fume_points_balance
      })),
      birthdayCustomers: upcomingBirthdays.slice(0, 5).map(c => ({
        name: c.name,
        phone: c.phone,
        birthday: c.date_of_birth
      }))
    };

    const AI_PROVIDER_API_KEY = Deno.env.get('AI_PROVIDER_API_KEY');
    const AI_PROVIDER_CHAT_URL = Deno.env.get('AI_PROVIDER_CHAT_URL') || 'https://api.openai.com/v1/chat/completions';
    const AI_PROVIDER_MODEL = Deno.env.get('AI_PROVIDER_MODEL') || 'gpt-4o-mini';
    if (!AI_PROVIDER_API_KEY) {
      console.error('AI_PROVIDER_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert sales coach for a premium cigar store. Your role is to provide actionable, personalized recommendations to help salespersons boost their performance.

Analyze the salesperson's data and provide recommendations in the following JSON format:
{
  "summary": "A brief 2-3 sentence overview of their current performance",
  "urgentActions": [
    {
      "title": "Action title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "customerName": "Optional customer name if applicable",
      "customerPhone": "Optional phone if applicable"
    }
  ],
  "callRecommendations": [
    {
      "customerName": "Customer name",
      "phone": "Phone number",
      "reason": "Why to call",
      "suggestedTime": "Best time to call",
      "talkingPoints": ["Point 1", "Point 2"]
    }
  ],
  "salesTips": [
    {
      "title": "Tip title",
      "description": "Detailed tip",
      "expectedImpact": "What improvement to expect"
    }
  ],
  "weeklyGoals": [
    {
      "goal": "Goal description",
      "metric": "How to measure success"
    }
  ]
}

Consider factors like:
- Customers who haven't ordered recently need follow-up calls
- Birthday customers should receive personalized outreach
- High Fume Points customers are valuable and should be retained
- Sales target progress determines urgency of actions
- Average order value can be improved through upselling

Keep recommendations specific, actionable, and focused on the cigar industry context.`;

    const userPrompt = `Here is the salesperson's current data:

${JSON.stringify(salesContext, null, 2)}

Provide personalized recommendations to help them improve their sales performance. Focus on:
1. Who they should call today and why
2. How to approach each customer conversation
3. Strategies to hit their quarterly target
4. Tips to increase average order value

Return ONLY valid JSON matching the specified format.`;

    console.log('Calling configured AI provider for sales recommendations...');

    const response = await fetch(AI_PROVIDER_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_PROVIDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_PROVIDER_MODEL,
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
      return new Response(JSON.stringify({ error: 'Unable to generate recommendations. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('No response content from AI');
      return new Response(JSON.stringify({ error: 'Unable to generate recommendations. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the JSON response
    let recommendations;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        aiResponse.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      recommendations = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, aiResponse);
      return new Response(JSON.stringify({ error: 'Unable to process recommendations. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      recommendations,
      context: salesContext
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sales-coach function:', error);
    return new Response(JSON.stringify({ 
      error: 'Unable to generate recommendations. Please try again later.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
