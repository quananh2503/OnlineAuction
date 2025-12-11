-- Add seller_expiration_date to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS seller_expiration_date timestamp with time zone;

-- Create blocked_bidders table if not exists
CREATE TABLE IF NOT EXISTS public.blocked_bidders (
  product_id integer NOT NULL,
  bidder_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT blocked_bidders_pkey PRIMARY KEY (product_id, bidder_id),
  CONSTRAINT blocked_bidders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT blocked_bidders_bidder_id_fkey FOREIGN KEY (bidder_id) REFERENCES public.users(id)
);
