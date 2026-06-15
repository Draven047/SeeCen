import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is triggered by a cron job at 8 AM daily
// It generates AI recommendations for all active sales users
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require shared cron secret to prevent unauthenticated invocation
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    console.log('Starting daily AI coach recommendations generation...');

    // Get all approved sales users
    const { data: salesUsers, error: usersError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'sales')
      .eq('is_approved', true);

    if (usersError) {
      console.error('Failed to fetch sales users:', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${salesUsers?.length || 0} sales users to generate recommendations for`);

    const results = {
      total: salesUsers?.length || 0,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Generate recommendations for each user
    for (const user of salesUsers || []) {
      try {
        // Call the generate function for this user
        const response = await fetch(`${supabaseUrl}/functions/v1/ai-coach-generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          results.success++;
          console.log(`Generated recommendations for user ${user.user_id}`);
        } else {
          results.failed++;
          const error = await response.text();
          results.errors.push(`User ${user.user_id}: ${error}`);
          console.error(`Failed for user ${user.user_id}:`, error);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${user.user_id}: ${error}`);
        console.error(`Error for user ${user.user_id}:`, error);
      }
    }

    console.log('Daily AI coach generation completed:', results);

    return new Response(JSON.stringify({
      message: 'Daily recommendations generation completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-coach-cron:', error);
    return new Response(JSON.stringify({ error: 'Cron job failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
