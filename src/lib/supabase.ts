import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://znbcxzbexjdexpsmjpli.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmN4emJleGpkZXhwc21qcGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzkzNjksImV4cCI6MjA5MTkxNTM2OX0.0Sg8C-LcGUyc5Kkn-BsZBNcVXrjE3pppIf0MTapuIpo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
