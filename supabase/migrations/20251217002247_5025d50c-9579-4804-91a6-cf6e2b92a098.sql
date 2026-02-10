-- Create table for storing daily AI coach recommendations
CREATE TABLE public.ai_coach_daily_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Core recommendations JSON
  cigars_to_push JSONB DEFAULT '[]'::jsonb,
  follow_up_customers JSONB DEFAULT '[]'::jsonb,
  cross_sell_opportunities JSONB DEFAULT '[]'::jsonb,
  offer_recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Target & incentive coaching
  incentive_coaching JSONB DEFAULT '{}'::jsonb,
  
  -- Stock priorities
  stock_priorities JSONB DEFAULT '[]'::jsonb,
  
  -- Daily summary text
  daily_summary TEXT,
  
  -- AI analysis metadata
  analysis_context JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One recommendation per user per day
  UNIQUE(user_id, recommendation_date)
);

-- Create table for AI coach chat history
CREATE TABLE public.ai_coach_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
  message_content TEXT NOT NULL,
  related_recommendation_id UUID REFERENCES public.ai_coach_daily_recommendations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_coach_daily_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily recommendations
CREATE POLICY "Users can view own recommendations" 
ON public.ai_coach_daily_recommendations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendations" 
ON public.ai_coach_daily_recommendations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update recommendations" 
ON public.ai_coach_daily_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for chat history
CREATE POLICY "Users can view own chat history" 
ON public.ai_coach_chat_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" 
ON public.ai_coach_chat_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_ai_coach_recommendations_user_date ON public.ai_coach_daily_recommendations(user_id, recommendation_date DESC);
CREATE INDEX idx_ai_coach_chat_user_date ON public.ai_coach_chat_history(user_id, created_at DESC);

-- Update trigger for recommendations
CREATE TRIGGER update_ai_coach_recommendations_updated_at
BEFORE UPDATE ON public.ai_coach_daily_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();