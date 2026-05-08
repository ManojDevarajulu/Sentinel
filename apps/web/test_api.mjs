import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "https://ycgoqbizjjbnmnnsdxny.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_qUq66ICr7NOvD6XJzUJQBg_yFwMb0Tc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = "testuser_v2@example.com";
  const password = "testpassword123";

  let token = null;
  
  console.log("Signing up...");
  let { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    console.log("Signup failed, trying login. Error:", error.message);
    const authRes = await supabase.auth.signInWithPassword({ email, password });
    if (authRes.error) {
      console.error("Login failed:", authRes.error);
      return;
    }
    data = authRes.data;
  }
  
  token = data.session?.access_token;
  if (!token) {
    console.error("Failed to get token");
    return;
  }

  console.log("Token acquired.");

  const repoData = {
    full_name: "Life Quest",
    scan_status: "pending",
    node_count: 0,
    default_branch: "main"
  };

  const { data: repo, error: dbError } = await supabase.from('repos').insert(repoData).select().single();
  
  if (dbError) {
    console.error("Failed to insert repo:", dbError);
    return;
  }

  const repoId = repo.id;
  console.log(`Created Repo with ID: ${repoId}`);

  const apiUrl = `http://localhost:8001/repos/${repoId}/scan`;
  const payload = {
    repo_id: repoId,
    repo_path: "/tmp/Life_Quest"
  };

  console.log(`Calling API: ${apiUrl}`);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const resData = await res.json();
    console.log("Scan response:", res.status, resData);
  } catch(e) {
    console.error("API call failed:", e);
  }
}

main();
