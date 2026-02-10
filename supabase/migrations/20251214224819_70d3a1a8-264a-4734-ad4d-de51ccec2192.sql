-- Create a function to validate order items against actual cigar prices
-- This prevents price manipulation by verifying prices match the catalog
CREATE OR REPLACE FUNCTION public.validate_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_price numeric;
BEGIN
  -- Get the actual price from cigars table
  SELECT price INTO actual_price
  FROM public.cigars
  WHERE id = NEW.cigar_id;
  
  -- If cigar not found, reject
  IF actual_price IS NULL THEN
    RAISE EXCEPTION 'Invalid cigar_id: cigar does not exist';
  END IF;
  
  -- Validate that unit_price matches the actual catalog price
  IF NEW.unit_price != actual_price THEN
    -- Auto-correct the price to prevent manipulation
    NEW.unit_price := actual_price;
  END IF;
  
  -- Validate quantity is positive
  IF NEW.quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;
  
  -- Recalculate total_price to ensure consistency
  NEW.total_price := NEW.unit_price * NEW.quantity;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate order items on insert
DROP TRIGGER IF EXISTS validate_order_item_trigger ON public.order_items;
CREATE TRIGGER validate_order_item_trigger
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item();