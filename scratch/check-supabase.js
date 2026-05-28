import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env file
const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      if (key === 'VITE_SUPABASE_URL' || key === 'SUPABASE_URL') {
        supabaseUrl = value;
      }
      if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY' || key === 'SUPABASE_PUBLISHABLE_KEY') {
        supabaseKey = value;
      }
    }
  }
} catch (err) {
  console.error("Error reading .env file:", err);
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

console.log("Connecting to Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log("Checking form_submissions table...");
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .limit(5);

  if (error) {
    console.error("❌ Error querying form_submissions:", error);
  } else {
    console.log("✅ Success! form_submissions exists.");
    console.log("Row count:", data.length);
    console.log("Sample Data:", data);
  }
}

checkTable();
