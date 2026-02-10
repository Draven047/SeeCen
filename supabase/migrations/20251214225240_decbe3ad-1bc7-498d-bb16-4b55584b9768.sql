-- Add is_approved column to user_roles table
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Update the handle_new_user function to create notification for admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  -- Insert user role (default sales, not approved)
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (new.id, 'sales', false);
  
  -- Create notification for all admin users
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT 
    ur.user_id,
    'New User Signup',
    'New user ' || COALESCE(new.raw_user_meta_data ->> 'full_name', new.email) || ' has signed up and is waiting for approval.',
    'info'
  FROM public.user_roles ur
  WHERE ur.role = 'admin' AND ur.is_approved = true;
  
  RETURN new;
END;
$$;

-- Update existing user_roles to be approved (for current users)
UPDATE public.user_roles SET is_approved = true WHERE is_approved = false;