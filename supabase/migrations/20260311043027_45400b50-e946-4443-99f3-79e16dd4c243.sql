-- Fix function search path mutable warning by setting search_path to empty string
alter function public.handle_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';