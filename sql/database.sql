-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bidder_requests (
  id integer NOT NULL DEFAULT nextval('bidder_requests_id_seq'::regclass),
  user_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  status USER-DEFINED DEFAULT 'PENDING'::request_status,
  approved_at timestamp with time zone,
  rejection_reason text,
  rejected_at timestamp with time zone,
  approved_by integer,
  rejected_by integer,
  CONSTRAINT bidder_requests_pkey PRIMARY KEY (id),
  CONSTRAINT bidder_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT bidder_requests_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id)
);
CREATE TABLE public.bids (
  id integer NOT NULL DEFAULT nextval('bids_id_seq'::regclass),
  product_id integer NOT NULL,
  bidder_id integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  CONSTRAINT bids_pkey PRIMARY KEY (id),
  CONSTRAINT bids_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT bids_bidder_id_fkey FOREIGN KEY (bidder_id) REFERENCES public.users(id)
);
CREATE TABLE public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name character varying NOT NULL,
  parent_id integer,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.comments (
  id integer NOT NULL DEFAULT nextval('comments_id_seq'::regclass),
  product_id integer NOT NULL,
  user_id integer NOT NULL,
  parent_id integer,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id)
);
CREATE TABLE public.descriptions (
  id integer NOT NULL DEFAULT nextval('descriptions_id_seq'::regclass),
  product_id integer NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT descriptions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.images (
  id integer NOT NULL DEFAULT nextval('images_id_seq'::regclass),
  product_id integer NOT NULL,
  url text NOT NULL,
  type USER-DEFINED NOT NULL,
  CONSTRAINT images_pkey PRIMARY KEY (id),
  CONSTRAINT images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.messages (
  id integer NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
  transaction_id integer NOT NULL,
  sender_id integer NOT NULL,
  receiver_id integer NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.products (
  id integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  seller_id integer NOT NULL,
  winner_id integer,
  category_id integer NOT NULL,
  name character varying NOT NULL,
  starts_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at timestamp with time zone NOT NULL,
  starting_price numeric NOT NULL,
  price_step numeric NOT NULL,
  buy_now_price numeric,
  avatar_url text,
  current_price numeric NOT NULL CHECK (current_price IS NOT NULL),
  bid_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  seller_allows_unrated_bidders boolean NOT NULL DEFAULT true,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT products_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.questions (
  id integer NOT NULL DEFAULT nextval('questions_id_seq'::regclass),
  product_id integer NOT NULL,
  user_id integer NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  answer_content text,
  answered_at timestamp with time zone,
  answered_by integer,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users(id)
);
CREATE TABLE public.ratings (
  id integer NOT NULL DEFAULT nextval('ratings_id_seq'::regclass),
  transaction_id integer NOT NULL,
  from_user_id integer NOT NULL,
  to_user_id integer NOT NULL,
  score integer NOT NULL CHECK (score = ANY (ARRAY['-1'::integer, 1])),
  content text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ratings_pkey PRIMARY KEY (id),
  CONSTRAINT ratings_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT ratings_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id),
  CONSTRAINT ratings_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.session (
  sid character varying NOT NULL,
  sess json NOT NULL,
  expire timestamp without time zone NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);
CREATE TABLE public.transactions (
  id integer NOT NULL DEFAULT nextval('transactions_id_seq'::regclass),
  product_id integer NOT NULL,
  buyer_id integer NOT NULL,
  seller_id integer NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL DEFAULT 'AWAITING_PAYMENT'::transaction_status,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  password character varying,
  address text,
  birthday date,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  role USER-DEFINED NOT NULL DEFAULT 'BIDDER'::user_role,
  store_name character varying,
  bidder_average_rating double precision,
  bidder_total_ratings_count integer NOT NULL DEFAULT 0,
  bidder_positive_ratings_count integer NOT NULL DEFAULT 0,
  seller_average_rating double precision,
  seller_total_ratings_count integer NOT NULL DEFAULT 0,
  seller_positive_ratings_count integer NOT NULL DEFAULT 0,
  google_id character varying,
  status character varying NOT NULL DEFAULT 'INACTIVE'::character varying,
  otp character varying,
  rating_positive_count integer NOT NULL DEFAULT 0,
  rating_negative_count integer NOT NULL DEFAULT 0,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.watchlists (
  user_id integer NOT NULL,
  product_id integer NOT NULL,
  CONSTRAINT watchlists_pkey PRIMARY KEY (user_id, product_id),
  CONSTRAINT watchlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT watchlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);