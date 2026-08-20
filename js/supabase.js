// js/supabase.js

const SUPABASE_URL = 'https://chfxbvudgmtcrqlcrdeh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZnhidnVkZ210Y3JxbGNyZGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzc4NTUsImV4cCI6MjEwMjcxMzg1NX0.IwerNqXRkNgRXkGHAs3py3tuzAd0rF4P_X5MHXoGRCw';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;