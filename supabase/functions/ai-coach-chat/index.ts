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
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, chatHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
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

    // Fetch today's recommendations for context
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRec } = await supabase
      .from('ai_coach_daily_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('recommendation_date', today)
      .maybeSingle();

    // Fetch real-time sales data
    const [
      { data: customers },
      { data: orders },
      { data: salesTargets },
      { data: profile },
      { data: cigars }
    ] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('orders').select('*, order_items(*, cigars(*))').eq('created_by', user.id),
      supabase.from('sales_targets').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('cigars').select('*')
    ]);

    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    const currentTarget = salesTargets?.find(t => t.quarter === currentQuarter && t.year === currentYear);
    
    const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0) || 0;
    const targetAmount = currentTarget?.target_amount || 50000;
    const achievedAmount = currentTarget?.achieved_amount || totalRevenue;

    // Build context summary
    const contextSummary = {
      salespersonName: profile?.full_name || 'Salesperson',
      totalCustomers: customers?.length || 0,
      totalOrders: orders?.length || 0,
      totalRevenue,
      targetAmount,
      achievedAmount,
      targetProgress: targetAmount > 0 ? ((achievedAmount / targetAmount) * 100).toFixed(1) : 0,
      remainingToTarget: Math.max(0, targetAmount - achievedAmount),
      todaysRecommendations: todayRec ? {
        summary: todayRec.daily_summary,
        topCigarsToSell: (todayRec.cigars_to_push as any[])?.slice(0, 3).map((c: any) => c.cigarName),
        topFollowUps: (todayRec.follow_up_customers as any[])?.slice(0, 3).map((c: any) => c.customerName)
      } : null
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an AI Sales Coach assistant for Cigatrax, a premium cigar store. You help salespersons with quick questions about their sales performance, customer follow-ups, product recommendations, and target progress.

Current context:
- Salesperson: ${contextSummary.salespersonName}
- Total Customers: ${contextSummary.totalCustomers}
- Total Orders: ${contextSummary.totalOrders}
- Revenue: ₹${contextSummary.totalRevenue.toLocaleString()}
- Target: ₹${contextSummary.targetAmount.toLocaleString()}
- Progress: ${contextSummary.targetProgress}%
- Remaining to Target: ₹${contextSummary.remainingToTarget.toLocaleString()}
${contextSummary.todaysRecommendations ? `
Today's AI Recommendations:
- Summary: ${contextSummary.todaysRecommendations.summary}
- Top Cigars to Sell: ${contextSummary.todaysRecommendations.topCigarsToSell?.join(', ') || 'None'}
- Top Follow-ups: ${contextSummary.todaysRecommendations.topFollowUps?.join(', ') || 'None'}
` : ''}

Guidelines:
- Be concise and actionable
- Use Indian Rupees (₹) for currency
- Reference specific data when available
- Be encouraging and supportive
- Keep responses under 200 words unless detailed explanation is needed
- If asked about specific customers or products not in context, suggest they check the full recommendations`;

    // Build messages array with chat history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('AI Coach chat request:', message);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
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
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI service error' }), {
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

    // Store chat messages
    const { data: recData } = await supabase
      .from('ai_coach_daily_recommendations')
      .select('id')
      .eq('user_id', user.id)
      .eq('recommendation_date', today)
      .maybeSingle();

    await supabaseAdmin.from('ai_coach_chat_history').insert([
      {
        user_id: user.id,
        message_role: 'user',
        message_content: message,
        related_recommendation_id: recData?.id
      },
      {
        user_id: user.id,
        message_role: 'assistant',
        message_content: aiResponse,
        related_recommendation_id: recData?.id
      }
    ]);

    return new Response(JSON.stringify({
      response: aiResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-coach-chat:', error);
    return new Response(JSON.stringify({ error: 'Chat service error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
