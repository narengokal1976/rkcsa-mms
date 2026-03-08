/*
  ╔══════════════════════════════════════════════════════════════╗
  ║         RKCSA MMS — Maintenance Management System           ║
  ║         Full Supabase-connected production app              ║
  ║                                                              ║
  ║  SETUP:                                                      ║
  ║  1. Create a free project at https://supabase.com           ║
  ║  2. Run supabase-schema.sql in the SQL Editor               ║
  ║  3. Create storage bucket "issue-photos" (public: ON)        ║
  ║  4. Replace SUPABASE_URL and SUPABASE_ANON_KEY below         ║
  ╚══════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── ⚙️  CONFIGURATION — REPLACE THESE WITH YOUR SUPABASE VALUES ──────────────
const SUPABASE_URL      = https://gbhcekypvbyxwnxpmznz.supabase.co;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaGNla3lwdmJ5eHdueHBtem56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODU5ODIsImV4cCI6MjA4ODU2MTk4Mn0.8SakdvB-hua3ii8Cf52dXsaniGOLfA7lTX-nFKAoaA0";
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_FLOW   = ["New", "In Progress", "Pending / On Hold", "Resolved / Closed"];
const CATEGORIES    = ["Structural","Electrical","Plumbing","Garden","Cleaning","Safety","Other"];
const STATUS_COLORS = {
  "New":                { bg:"#FFF3E0", text:"#BF360C", dot:"#FF6D00" },
  "In Progress":        { bg:"#E8F4FD", text:"#0D47A1", dot:"#1976D2" },
  "Pending / On Hold":  { bg:"#FFFDE7", text:"#F57F17", dot:"#F9A825" },
  "Resolved / Closed":  { bg:"#E8F5E9", text:"#1B5E20", dot:"#388E3C" },
};

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
const db = {
  // Auth
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),

  // Profiles
  getProfiles: () => supabase.from("profiles").select("*").order("full_name"),
  getProfile:  (id) => supabase.from("profiles").select("*").eq("id", id).single(),

  // Issues  
  getIssues: () =>
    supabase.from("issues").select(`
      *, 
      reporter:reported_by(id, full_name, role),
      assignee:assigned_to(id, full_name, role),
      comments(count)
    `).order("created_at", { ascending: false }),

  getIssue: (id) =>
    supabase.from("issues").select(`
      *,
      reporter:reported_by(id, full_name, role),
      assignee:assigned_to(id, full_name, role)
    `).eq("id", id).single(),

  createIssue: (data) => supabase.from("issues").insert(data).select().single(),

  updateIssue: (id, data) =>
    supabase.from("issues").update(data).eq("id", id).select(`
      *,
      reporter:reported_by(id, full_name, role),
      assignee:assigned_to(id, full_name, role)
    `).single(),

  // Comments
  getComments: (issueId) =>
    supabase.from("comments").select(`
      *, author:author_id(id, full_name, role)
    `).eq("issue_id", issueId).order("created_at"),

  addComment: (data) => supabase.from("comments").insert(data).select(`
    *, author:author_id(id, full_name, role)
  `).single(),

  // Storage
  uploadPhoto: async (file) => {
    const ext  = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("issue-photos").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("issue-photos").getPublicUrl(path);
    return data.publicUrl;
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { day:"2-digit", month:"short", year:"numeric" })
    + " " + d.toLocaleTimeString("en-ZA", { hour:"2-digit", minute:"2-digit" });
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --crimson:#8B1A1A;
  --crimson-deep:#5C0F0F;
  --crimson-light:#C0392B;
  --gold:#C9921A;
  --gold-light:#E8B84B;
  --gold-pale:#FDF6E3;
  --cream:#FAF8F4;
  --parchment:#F0EAD6;
  --bark:#2C1810;
  --ink:#1A0A00;
  --sage:#5C7A5C;
  --white:#FFFFFF;
  --border:rgba(139,26,26,0.12);
  --shadow:rgba(44,24,16,0.10);
  --shadow-deep:rgba(44,24,16,0.20);
  --text:#2C1810;
  --text-muted:#7A5C50;
  --font-display:'Playfair Display',Georgia,serif;
  --font-body:'Outfit',system-ui,sans-serif;
  --r:14px;--r-sm:8px;--r-xs:6px;
}

body{font-family:var(--font-body);background:var(--cream);color:var(--text);line-height:1.5;}
button{font-family:var(--font-body);}
input,select,textarea{font-family:var(--font-body);}

/* ── GLOBAL ANIMATIONS ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

.fade-up{animation:fadeUp .35s ease both;}
.fade-in{animation:fadeIn .25s ease both;}

/* ── SPINNER ── */
.spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
.spinner.dark{border-color:rgba(139,26,26,.2);border-top-color:var(--crimson);}

/* ── LOGIN ── */
.login-page{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--crimson-deep) 0%,var(--crimson) 45%,var(--gold) 100%);
  padding:24px;position:relative;overflow:hidden;
}
.login-page::before{
  content:'';position:absolute;inset:0;
  background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
.login-card{
  background:var(--white);border-radius:24px;padding:52px 44px;
  width:100%;max-width:440px;box-shadow:0 40px 100px rgba(0,0,0,.4);
  position:relative;z-index:1;
  animation:fadeUp .5s ease;
}
.login-emblem{
  width:80px;height:80px;border-radius:50%;margin:0 auto 20px;
  background:linear-gradient(135deg,var(--crimson-deep) 0%,var(--crimson-light) 100%);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 28px rgba(139,26,26,.4);
}
.login-heading{font-family:var(--font-display);font-size:30px;font-weight:800;color:var(--bark);text-align:center;line-height:1.1;}
.login-sub{font-size:13px;color:var(--text-muted);text-align:center;margin-top:5px;letter-spacing:.02em;}
.login-divider{border:none;border-top:1px solid var(--border);margin:24px 0;}
.field{margin-bottom:18px;}
.field-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:7px;}
.field-input{
  width:100%;padding:13px 16px;border:2px solid var(--border);border-radius:var(--r-sm);
  font-size:15px;color:var(--text);background:var(--cream);outline:none;
  transition:border-color .2s,background .2s;
}
.field-input:focus{border-color:var(--crimson);background:var(--white);}
.btn-primary{
  width:100%;padding:14px;background:linear-gradient(135deg,var(--crimson-deep),var(--crimson-light));
  color:#fff;border:none;border-radius:var(--r-sm);font-size:15px;font-weight:600;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px;
  transition:transform .15s,box-shadow .15s;box-shadow:0 4px 18px rgba(139,26,26,.4);
  margin-top:8px;
}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,26,26,.5);}
.btn-primary:active:not(:disabled){transform:translateY(0);}
.btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.btn-secondary{
  padding:10px 18px;background:transparent;border:2px solid var(--crimson);color:var(--crimson);
  border-radius:var(--r-sm);font-size:14px;font-weight:600;cursor:pointer;
  transition:background .15s,color .15s;white-space:nowrap;
}
.btn-secondary:hover{background:var(--crimson);color:#fff;}
.btn-ghost{
  padding:8px 14px;background:transparent;border:none;color:var(--text-muted);
  font-size:13px;font-weight:500;cursor:pointer;border-radius:var(--r-xs);
  transition:background .15s,color .15s;
}
.btn-ghost:hover{background:var(--parchment);color:var(--text);}
.error-box{background:#FEE;border:1px solid #FCC;color:#900;border-radius:var(--r-sm);padding:11px 14px;font-size:13px;margin-bottom:16px;}
.info-box{background:var(--gold-pale);border:1px solid rgba(201,146,26,.3);color:var(--bark);border-radius:var(--r-sm);padding:12px 14px;font-size:12px;margin-top:16px;}
.info-box strong{display:block;color:var(--gold);margin-bottom:3px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;}

/* ── LAYOUT ── */
.layout{display:flex;min-height:100vh;}

/* ── SIDEBAR ── */
.sidebar{
  width:268px;background:var(--crimson-deep);min-height:100vh;
  display:flex;flex-direction:column;flex-shrink:0;
  position:sticky;top:0;height:100vh;overflow-y:auto;
}
.sidebar-header{padding:28px 22px 22px;border-bottom:1px solid rgba(255,255,255,.08);}
.sidebar-logo{
  width:46px;height:46px;border-radius:12px;
  background:linear-gradient(135deg,var(--gold),var(--gold-light));
  display:flex;align-items:center;justify-content:center;
  margin-bottom:14px;box-shadow:0 4px 14px rgba(201,146,26,.4);
}
.sidebar-name{font-family:var(--font-display);font-size:18px;font-weight:800;color:#fff;line-height:1.15;}
.sidebar-tagline{font-size:10px;color:rgba(255,255,255,.4);margin-top:4px;letter-spacing:.12em;text-transform:uppercase;}
.nav{flex:1;padding:14px 10px;display:flex;flex-direction:column;gap:3px;}
.nav-btn{
  display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:var(--r-sm);
  cursor:pointer;color:rgba(255,255,255,.5);font-size:14px;font-weight:500;
  border:none;background:transparent;width:100%;text-align:left;
  transition:background .15s,color .15s;
}
.nav-btn:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);}
.nav-btn.active{background:rgba(201,146,26,.25);color:var(--gold-light);}
.nav-divider{border:none;border-top:1px solid rgba(255,255,255,.06);margin:8px 0;}
.sidebar-footer{padding:16px 18px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:11px;}
.avatar{
  width:36px;height:36px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,var(--gold),var(--crimson-light));
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;color:#fff;
}
.avatar.lg{width:48px;height:48px;font-size:18px;}
.user-name{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.user-role{font-size:11px;color:rgba(255,255,255,.4);}
.icon-btn{background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,.35);padding:5px;border-radius:var(--r-xs);transition:color .15s;}
.icon-btn:hover{color:rgba(255,255,255,.8);}

/* ── MAIN ── */
.main{flex:1;min-width:0;display:flex;flex-direction:column;}
.topbar{
  background:var(--white);border-bottom:1px solid var(--border);
  padding:16px 32px;display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:10;
}
.topbar-title{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--bark);}
.topbar-sub{font-size:12px;color:var(--text-muted);margin-top:2px;}
.content{flex:1;padding:32px;background:var(--cream);}

/* ── CARDS ── */
.card{background:var(--white);border-radius:var(--r);border:1px solid var(--border);box-shadow:0 2px 14px var(--shadow);}
.card-pad{padding:24px 28px;}
.card-title{font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--bark);margin-bottom:16px;}

/* ── STATS ── */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:28px;}
.stat{background:var(--white);border-radius:var(--r);border:1px solid var(--border);box-shadow:0 2px 14px var(--shadow);padding:20px;}
.stat-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:8px;}
.stat-val{font-family:var(--font-display);font-size:38px;font-weight:800;color:var(--bark);line-height:1;}
.stat-pill{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;}
.dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

/* ── TOOLBAR ── */
.toolbar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.search{
  flex:1;min-width:180px;padding:10px 14px;
  border:2px solid var(--border);border-radius:var(--r-sm);font-size:14px;
  background:var(--white);color:var(--text);outline:none;transition:border-color .2s;
}
.search:focus{border-color:var(--crimson);}
.sel{
  padding:10px 14px;border:2px solid var(--border);border-radius:var(--r-sm);
  font-size:14px;background:var(--white);color:var(--text);outline:none;cursor:pointer;
}

/* ── ISSUE CARD ── */
.issue-card{
  background:var(--white);border-radius:var(--r);border:1px solid var(--border);
  box-shadow:0 2px 12px var(--shadow);margin-bottom:10px;
  cursor:pointer;display:flex;overflow:hidden;
  transition:transform .15s,box-shadow .15s;
}
.issue-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px var(--shadow-deep);}
.issue-accent{width:5px;flex-shrink:0;}
.issue-body{flex:1;padding:16px 20px;}
.issue-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.issue-ref{font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.08em;}
.issue-title{font-size:16px;font-weight:600;color:var(--bark);margin:3px 0 6px;line-height:1.3;}
.issue-desc{font-size:13px;color:var(--text-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.issue-meta{display:flex;gap:14px;margin-top:10px;flex-wrap:wrap;}
.meta{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);}
.status-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}
.cat-badge{background:var(--parchment);color:var(--bark);font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;}
.badges{display:flex;gap:6px;flex-direction:column;align-items:flex-end;flex-shrink:0;}

/* ── DETAIL ── */
.detail-wrap{max-width:800px;}
.back-btn{display:flex;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;font-weight:500;padding:0;margin-bottom:22px;transition:color .15s;}
.back-btn:hover{color:var(--crimson);}
.detail-header{padding:26px 30px;border-bottom:1px solid var(--border);}
.detail-ref{font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.1em;margin-bottom:8px;}
.detail-title{font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--bark);line-height:1.2;margin-bottom:14px;}
.detail-body{padding:26px 30px;}
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:8px;}
.detail-text{font-size:15px;line-height:1.7;color:var(--text);}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:4px;}
.info-val{font-size:14px;font-weight:500;color:var(--text);margin-top:4px;}
.photo-box{border-radius:var(--r-sm);overflow:hidden;background:var(--parchment);min-height:180px;display:flex;align-items:center;justify-content:center;}
.photo-box img{width:100%;height:auto;display:block;}
.no-photo{padding:40px;text-align:center;color:var(--text-muted);font-size:13px;}

/* ── STATUS SWITCHER ── */
.status-strip{display:flex;margin-bottom:18px;}
.status-seg{
  flex:1;padding:10px 6px;text-align:center;font-size:11px;font-weight:700;
  cursor:pointer;border:2px solid var(--border);background:var(--cream);color:var(--text-muted);
  transition:all .15s;position:relative;letter-spacing:.02em;
}
.status-seg:first-child{border-radius:var(--r-sm) 0 0 var(--r-sm);}
.status-seg:last-child{border-radius:0 var(--r-sm) var(--r-sm) 0;}
.status-seg:not(:first-child){margin-left:-2px;}
.status-seg.active{background:var(--crimson);border-color:var(--crimson);color:#fff;z-index:1;}
.status-seg:hover:not(.active){background:var(--parchment);color:var(--bark);}

/* ── COMMENTS ── */
.comments-list{display:flex;flex-direction:column;gap:14px;margin-bottom:18px;}
.comment{display:flex;gap:12px;}
.c-bubble{background:var(--parchment);border-radius:0 var(--r-sm) var(--r-sm) var(--r-sm);padding:12px 15px;flex:1;}
.c-author{font-size:12px;font-weight:700;color:var(--bark);}
.c-time{font-size:11px;color:var(--text-muted);margin-left:8px;}
.c-text{font-size:14px;color:var(--text);margin-top:4px;line-height:1.5;}
.comment-row{display:flex;gap:10px;}
.comment-input{flex:1;padding:10px 14px;border:2px solid var(--border);border-radius:var(--r-sm);font-size:14px;background:var(--cream);color:var(--text);outline:none;resize:none;transition:border-color .2s;}
.comment-input:focus{border-color:var(--crimson);}

/* ── FORM ── */
.form-card{background:var(--white);border-radius:var(--r);border:1px solid var(--border);box-shadow:0 4px 20px var(--shadow);padding:36px;max-width:660px;}
.form-title{font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--bark);margin-bottom:6px;}
.form-sub{font-size:13px;color:var(--text-muted);margin-bottom:28px;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.form-field{display:flex;flex-direction:column;margin-bottom:4px;}
.form-field.full{grid-column:1/-1;}
.form-textarea{padding:12px 16px;border:2px solid var(--border);border-radius:var(--r-sm);font-size:15px;background:var(--cream);color:var(--text);outline:none;resize:vertical;min-height:110px;transition:border-color .2s;}
.form-textarea:focus{border-color:var(--crimson);}
.upload-zone{
  border:2px dashed var(--border);border-radius:var(--r-sm);padding:36px 20px;
  text-align:center;cursor:pointer;transition:all .2s;background:var(--cream);
}
.upload-zone:hover{border-color:var(--crimson);background:rgba(139,26,26,.03);}
.upload-zone.filled{padding:0;overflow:hidden;border-style:solid;border-color:var(--gold);}
.upload-zone img{width:100%;height:auto;display:block;}
.upload-label{font-size:14px;font-weight:500;color:var(--text-muted);margin-top:10px;}
.upload-hint{font-size:12px;color:var(--text-muted);margin-top:3px;}
.success-bar{background:#E8F5E9;border:1px solid #A5D6A7;color:#1B5E20;border-radius:var(--r-sm);padding:14px 18px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px;margin-bottom:22px;animation:fadeIn .3s;}
.char-limit{font-size:11px;color:var(--text-muted);text-align:right;margin-top:4px;}

/* ── EMPTY ── */
.empty{text-align:center;padding:64px 24px;}
.empty-title{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--bark);margin:14px 0 6px;}
.empty-sub{font-size:14px;color:var(--text-muted);}

/* ── CONFIG BANNER ── */
.config-banner{
  background:linear-gradient(135deg,#1A0A00,#2C1810);
  color:#fff;padding:20px 28px;border-radius:var(--r);margin-bottom:24px;
  border-left:4px solid var(--gold);
}
.config-banner h3{font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--gold-light);margin-bottom:8px;}
.config-banner p{font-size:13px;color:rgba(255,255,255,.7);line-height:1.6;}
.config-banner code{background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;font-size:12px;color:var(--gold-light);}

/* ── LOADING ── */
.page-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:var(--crimson-deep);gap:16px;}
.page-loading-logo{width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,var(--gold),var(--gold-light));display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(201,146,26,.5);animation:pulse 2s infinite;}
.page-loading-text{font-family:var(--font-display);font-size:20px;font-weight:700;color:rgba(255,255,255,.8);}

/* ── MOBILE ── */
@media(max-width:768px){
  .sidebar{display:none;}
  .content{padding:16px;}
  .topbar{padding:12px 16px;}
  .form-grid{grid-template-columns:1fr;}
  .info-grid{grid-template-columns:1fr;}
  .stats{grid-template-columns:1fr 1fr;}
  .status-seg{font-size:9px;padding:8px 3px;}
}
`;

// ─── ICON COMPONENTS ──────────────────────────────────────────────────────────
const I = ({ n, s=18, c="currentColor" }) => {
  const d = {
    shield:   "M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z",
    list:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    grid:     "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
    plus:     "M12 4v16m8-8H4",
    user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    logout:   "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    back:     "M15 19l-7-7 7-7",
    camera:   "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
    msg:      "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    check:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    clock:    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    tag:      "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z",
    img:      "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    assign:   "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    wrench:   "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(d[n]||"").split(" M").map((p,i)=><path key={i} d={(i===0?"":" M")+p}/>)}
    </svg>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]       = useState(null);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState("dashboard");
  const [issues, setIssues]         = useState([]);
  const [profiles, setProfiles]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const configured = SUPABASE_URL !== "https://YOUR_PROJECT_ID.supabase.co";

  // ── Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (id) => {
    const { data } = await db.getProfile(id);
    setProfile(data);
    setLoading(false);
  };

  // ── Load data when logged in
  useEffect(() => {
    if (!session) return;
    loadIssues();
    loadProfiles();
  }, [session]);

  const loadIssues = async () => {
    setIssuesLoading(true);
    const { data } = await db.getIssues();
    setIssues(data || []);
    setIssuesLoading(false);
  };

  const loadProfiles = async () => {
    const { data } = await db.getProfiles();
    setProfiles(data || []);
  };

  const openIssue = (id) => { setSelectedId(id); setView("detail"); };
  const navigate  = (v)  => { setView(v); setSelectedId(null); };

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="page-loading">
        <div className="page-loading-logo"><I n="wrench" s={30} c="#fff" /></div>
        <div className="page-loading-text">RKCSA MMS</div>
        <div className="spinner" />
      </div>
    </>
  );

  if (!session || !profile) return (
    <>
      <style>{css}</style>
      <LoginScreen configured={configured} onLogin={() => { loadIssues(); loadProfiles(); }} />
    </>
  );

  const selectedIssue = issues.find(i => i.id === selectedId);

  return (
    <>
      <style>{css}</style>
      <div className="layout">
        <Sidebar profile={profile} view={view} navigate={navigate} onLogout={() => db.signOut()} />
        <div className="main">
          <Topbar view={view} issue={selectedIssue} />
          <div className="content">
            {!configured && <ConfigBanner />}
            {view === "dashboard" && (
              <Dashboard issues={issues} loading={issuesLoading} openIssue={openIssue} navigate={navigate} />
            )}
            {view === "issues" && (
              <IssuesList issues={issues} loading={issuesLoading} openIssue={openIssue} />
            )}
            {view === "new" && (
              <NewIssueForm
                profile={profile} profiles={profiles}
                onSuccess={() => { loadIssues(); navigate("issues"); }}
              />
            )}
            {view === "detail" && selectedIssue && (
              <IssueDetail
                issue={selectedIssue} profile={profile} profiles={profiles}
                onBack={() => navigate("issues")}
                onUpdate={(updated) => {
                  setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
                  setSelectedId(updated.id);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── CONFIG BANNER ────────────────────────────────────────────────────────────
function ConfigBanner() {
  return (
    <div className="config-banner">
      <h3>⚙️ Supabase Not Yet Connected</h3>
      <p>
        To connect to a live database, replace <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> at the top of this file with your project credentials from{" "}
        <strong>supabase.com → Project Settings → API</strong>.
        Then run <code>supabase-schema.sql</code> in the Supabase SQL Editor to create all tables.
        The app is currently running in read-only demo mode.
      </p>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ configured, onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const submit = async () => {
    setError(""); setBusy(true);
    const { error } = await db.signIn(email.trim(), password);
    if (error) { setError(error.message); setBusy(false); }
    else onLogin();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-emblem"><I n="shield" s={34} c="#fff" /></div>
        <div className="login-heading">RKCSA MMS</div>
        <div className="login-sub">Maintenance Management System</div>
        <hr className="login-divider" />
        {error && <div className="error-box">{error}</div>}
        {!configured && (
          <div className="error-box" style={{marginBottom:16}}>
            ⚠️ Supabase is not configured yet. Update SUPABASE_URL and SUPABASE_ANON_KEY in the source code.
          </div>
        )}
        <div className="field">
          <label className="field-label">Email Address</label>
          <input className="field-input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="your@email.com" autoComplete="email" />
        </div>
        <div className="field">
          <label className="field-label">Password</label>
          <input className="field-input" type="password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <button className="btn-primary" onClick={submit} disabled={busy||!email||!password}>
          {busy ? <><div className="spinner"/>Signing in…</> : "Sign In"}
        </button>
        <div className="info-box">
          <strong>How to add users</strong>
          Go to Supabase → Authentication → Users → Invite User. Enter their email and they will receive a setup link. Their role can be set in the Profiles table.
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ profile, view, navigate, onLogout }) {
  const nav = [
    { id:"dashboard", label:"Dashboard",     icon:"grid"   },
    { id:"issues",    label:"All Issues",    icon:"list"   },
    { id:"new",       label:"Log New Issue", icon:"plus"   },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo"><I n="wrench" s={22} c="#fff" /></div>
        <div className="sidebar-name">RKCSA MMS</div>
        <div className="sidebar-tagline">Maintenance System</div>
      </div>
      <nav className="nav">
        {nav.map(item => (
          <button key={item.id} className={`nav-btn${view===item.id?" active":""}`} onClick={()=>navigate(item.id)}>
            <I n={item.icon} s={17} c="currentColor" />{item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar">{profile.full_name.charAt(0).toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="user-name">{profile.full_name}</div>
          <div className="user-role">{profile.role}</div>
        </div>
        <button className="icon-btn" onClick={onLogout} title="Sign out"><I n="logout" s={16} /></button>
      </div>
    </aside>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ view, issue }) {
  const map = {
    dashboard: { title:"Dashboard",       sub:"Overview of all maintenance issues"     },
    issues:    { title:"All Issues",      sub:"Browse and manage reported issues"      },
    new:       { title:"Log New Issue",   sub:"Report a new maintenance problem"       },
    detail:    { title: issue?.ref_no||"Issue", sub: issue?.title||""                  },
  };
  const t = map[view] || map.dashboard;
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{t.title}</div>
        <div className="topbar-sub">{t.sub}</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ issues, loading, openIssue, navigate }) {
  const counts = STATUS_FLOW.reduce((a,s) => { a[s]=issues.filter(i=>i.status===s).length; return a; }, {});
  const recent = [...issues].slice(0,5);
  return (
    <div className="fade-up">
      <div className="stats">
        {STATUS_FLOW.map(s => {
          const c = STATUS_COLORS[s];
          return (
            <div key={s} className="stat">
              <div className="stat-label">{s}</div>
              <div className="stat-val">{counts[s]}</div>
              <div className="stat-pill" style={{background:c.bg,color:c.text}}>
                <div className="dot" style={{background:c.dot}}/>
                {counts[s]===1?"issue":"issues"}
              </div>
            </div>
          );
        })}
        <div className="stat">
          <div className="stat-label">Total</div>
          <div className="stat-val">{issues.length}</div>
          <div className="stat-pill" style={{background:"var(--parchment)",color:"var(--bark)"}}>all time</div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:"var(--bark)"}}>Recent Issues</div>
        <button className="btn-secondary" onClick={()=>navigate("issues")}>View All</button>
      </div>
      {loading && <LoadingCards />}
      {!loading && recent.map(issue=><IssueCard key={issue.id} issue={issue} onClick={()=>openIssue(issue.id)}/>)}
      {!loading && issues.length===0 && <EmptyState icon="list" title="No issues yet" sub="Log the first maintenance issue to get started." />}
    </div>
  );
}

// ─── ISSUES LIST ──────────────────────────────────────────────────────────────
function IssuesList({ issues, loading, openIssue }) {
  const [q, setQ]       = useState("");
  const [st, setSt]     = useState("All");
  const [cat, setCat]   = useState("All");

  const filtered = issues.filter(i => {
    const mq  = !q || i.title.toLowerCase().includes(q.toLowerCase()) || i.ref_no.toLowerCase().includes(q.toLowerCase()) || i.description.toLowerCase().includes(q.toLowerCase());
    const ms  = st==="All"  || i.status===st;
    const mc  = cat==="All" || i.category===cat;
    return mq && ms && mc;
  });

  return (
    <div className="fade-up">
      <div className="toolbar">
        <input className="search" placeholder="Search issues, reference numbers…" value={q} onChange={e=>setQ(e.target.value)}/>
        <select className="sel" value={st} onChange={e=>setSt(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUS_FLOW.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="sel" value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {loading && <LoadingCards />}
      {!loading && filtered.length===0 && <EmptyState icon="list" title="No issues found" sub="Try adjusting your search or filters." />}
      {!loading && filtered.map(issue=><IssueCard key={issue.id} issue={issue} onClick={()=>openIssue(issue.id)}/>)}
    </div>
  );
}

// ─── ISSUE CARD ───────────────────────────────────────────────────────────────
function IssueCard({ issue, onClick }) {
  const c = STATUS_COLORS[issue.status]||STATUS_COLORS["New"];
  const commentCount = issue.comments?.[0]?.count ?? issue.comments?.length ?? 0;
  return (
    <div className="issue-card fade-up" onClick={onClick}>
      <div className="issue-accent" style={{background:c.dot}}/>
      <div className="issue-body">
        <div className="issue-row">
          <div style={{flex:1,minWidth:0}}>
            <div className="issue-ref">{issue.ref_no}</div>
            <div className="issue-title">{issue.title}</div>
            <div className="issue-desc">{issue.description}</div>
          </div>
          <div className="badges">
            <div className="status-badge" style={{background:c.bg,color:c.text}}>
              <div className="dot" style={{background:c.dot}}/>{issue.status}
            </div>
            <div className="cat-badge">{issue.category}</div>
          </div>
        </div>
        <div className="issue-meta">
          <div className="meta"><I n="user" s={13}/>{issue.reporter?.full_name||"Unknown"}</div>
          {issue.assignee && <div className="meta"><I n="assign" s={13}/>{issue.assignee.full_name}</div>}
          <div className="meta"><I n="clock" s={13}/>{fmt(issue.created_at)}</div>
          <div className="meta"><I n="msg" s={13}/>{commentCount} comment{commentCount!==1?"s":""}</div>
          {issue.image_url && <div className="meta"><I n="img" s={13}/>Photo</div>}
        </div>
      </div>
    </div>
  );
}

// ─── ISSUE DETAIL ─────────────────────────────────────────────────────────────
function IssueDetail({ issue, profile, profiles, onBack, onUpdate }) {
  const [comments, setComments]   = useState([]);
  const [newComment, setNewComment] = useState("");
  const [assignedTo, setAssignedTo] = useState(issue.assigned_to||"");
  const [saving, setSaving]       = useState(false);
  const [commBusy, setCommBusy]   = useState(false);
  const [commLoading, setCommLoading] = useState(true);

  useEffect(() => {
    db.getComments(issue.id).then(({data})=>{ setComments(data||[]); setCommLoading(false); });
  }, [issue.id]);

  if (!issue) return null;
  const c = STATUS_COLORS[issue.status]||STATUS_COLORS["New"];

  const changeStatus = async (newStatus) => {
    if (newStatus===issue.status) return;
    setSaving(true);
    const {data,error} = await db.updateIssue(issue.id,{status:newStatus});
    if (!error) onUpdate(data);
    setSaving(false);
  };

  const saveAssignment = async () => {
    setSaving(true);
    const {data,error} = await db.updateIssue(issue.id,{assigned_to:assignedTo||null});
    if (!error) onUpdate(data);
    setSaving(false);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setCommBusy(true);
    const {data,error} = await db.addComment({issue_id:issue.id,author_id:profile.id,text:newComment.trim()});
    if (!error) { setComments(prev=>[...prev,data]); setNewComment(""); }
    setCommBusy(false);
  };

  return (
    <div className="detail-wrap fade-up">
      <button className="back-btn" onClick={onBack}><I n="back" s={18}/>Back to Issues</button>

      {/* Header card */}
      <div className="card" style={{marginBottom:18}}>
        <div className="detail-header">
          <div className="detail-ref">{issue.ref_no}</div>
          <div className="detail-title">{issue.title}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <div className="status-badge" style={{background:c.bg,color:c.text}}>
              <div className="dot" style={{background:c.dot}}/>{issue.status}
            </div>
            <div className="cat-badge">{issue.category}</div>
          </div>
        </div>
        <div className="detail-body">
          {issue.image_url && (
            <div style={{marginBottom:22}}>
              <div className="section-label">Photo</div>
              <div className="photo-box"><img src={issue.image_url} alt="Issue photo"/></div>
            </div>
          )}
          {!issue.image_url && (
            <div style={{marginBottom:22}}>
              <div className="section-label">Photo</div>
              <div className="photo-box no-photo"><I n="camera" s={28} c="var(--text-muted)"/><div style={{marginTop:8}}>No photo attached</div></div>
            </div>
          )}
          <div style={{marginBottom:22}}>
            <div className="section-label">Description</div>
            <div className="detail-text">{issue.description}</div>
          </div>
          <div className="info-grid">
            <div><div className="section-label">Reported By</div><div className="info-val">{issue.reporter?.full_name||"—"}</div></div>
            <div><div className="section-label">Assigned To</div><div className="info-val">{issue.assignee?.full_name||<span style={{color:"var(--text-muted)",fontStyle:"italic"}}>Unassigned</span>}</div></div>
            <div><div className="section-label">Logged On</div><div className="info-val">{fmt(issue.created_at)}</div></div>
            <div><div className="section-label">Last Updated</div><div className="info-val">{fmt(issue.updated_at)}</div></div>
          </div>
        </div>
      </div>

      {/* Status + Assignment */}
      <div className="card card-pad" style={{marginBottom:18}}>
        <div className="card-title">Update Status {saving && <span className="spinner dark" style={{marginLeft:8}}/>}</div>
        <div className="status-strip">
          {STATUS_FLOW.map(s=>(
            <div key={s} className={`status-seg${issue.status===s?" active":""}`} onClick={()=>changeStatus(s)}>{s}</div>
          ))}
        </div>
        <div>
          <div className="section-label" style={{marginBottom:8}}>Assign To</div>
          <div style={{display:"flex",gap:10}}>
            <select className="sel" style={{flex:1}} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
              <option value="">— Unassigned —</option>
              {profiles.map(p=><option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
            </select>
            <button className="btn-secondary" onClick={saveAssignment} disabled={saving}>Save</button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card card-pad">
        <div className="card-title">Comments ({comments.length})</div>
        {commLoading && <div style={{textAlign:"center",padding:"20px 0"}}><div className="spinner dark" /></div>}
        {!commLoading && comments.length===0 && <div style={{color:"var(--text-muted)",fontSize:13,marginBottom:16}}>No comments yet. Be the first to add one.</div>}
        {!commLoading && comments.length>0 && (
          <div className="comments-list">
            {comments.map(cm=>(
              <div key={cm.id} className="comment">
                <div className="avatar" style={{width:32,height:32,fontSize:13}}>{(cm.author?.full_name||"?").charAt(0).toUpperCase()}</div>
                <div className="c-bubble">
                  <span className="c-author">{cm.author?.full_name||"Unknown"}</span>
                  <span className="c-time">{fmt(cm.created_at)}</span>
                  <div className="c-text">{cm.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="comment-row">
          <textarea className="comment-input" rows={2} placeholder="Add a comment…" value={newComment} onChange={e=>setNewComment(e.target.value)}/>
          <button className="btn-primary" style={{width:"auto",padding:"10px 20px",alignSelf:"flex-end"}} onClick={postComment} disabled={commBusy||!newComment.trim()}>
            {commBusy?<div className="spinner"/>:"Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW ISSUE FORM ───────────────────────────────────────────────────────────
function NewIssueForm({ profile, profiles, onSuccess }) {
  const [title, setTitle]         = useState("");
  const [desc, setDesc]           = useState("");
  const [cat, setCat]             = useState("Other");
  const [assignTo, setAssignTo]   = useState("");
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [busy, setBusy]           = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target.result);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!title.trim()||!desc.trim()) return;
    setError(""); setBusy(true);
    try {
      let image_url = null;
      if (file) image_url = await db.uploadPhoto(file);
      const {error} = await db.createIssue({
        title: title.trim(),
        description: desc.trim(),
        category: cat,
        reported_by: profile.id,
        assigned_to: assignTo||null,
        image_url,
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(()=>{ onSuccess(); }, 1500);
    } catch(e) {
      setError(e.message||"Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="form-card fade-up">
      <div className="form-title">Report a Maintenance Issue</div>
      <div className="form-sub">Document a problem found at the ashram so it can be tracked and resolved.</div>
      {success && (
        <div className="success-bar">
          <I n="check" s={18} c="#2E7D32"/> Issue logged successfully! Redirecting…
        </div>
      )}
      {error && <div className="error-box" style={{marginBottom:18}}>{error}</div>}
      <div className="form-grid">
        <div className="form-field full">
          <label className="field-label">Issue Title *</label>
          <input className="field-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Broken tile near main entrance" maxLength={120}/>
          <div className="char-limit">{title.length}/120</div>
        </div>
        <div className="form-field">
          <label className="field-label">Category</label>
          <select className="field-input" value={cat} onChange={e=>setCat(e.target.value)}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="field-label">Assign To (optional)</label>
          <select className="field-input" value={assignTo} onChange={e=>setAssignTo(e.target.value)}>
            <option value="">— Unassigned —</option>
            {profiles.map(p=><option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label className="field-label">Description *</label>
          <textarea className="form-textarea" value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Describe the issue — exact location, severity, what you observed…" maxLength={1000}/>
          <div className="char-limit">{desc.length}/1000</div>
        </div>
        <div className="form-field full">
          <label className="field-label">Photo (optional)</label>
          <div className={`upload-zone${preview?" filled":""}`} onClick={()=>fileRef.current.click()}>
            {preview
              ? <img src={preview} alt="Preview"/>
              : <>
                  <I n="camera" s={32} c="var(--text-muted)"/>
                  <div className="upload-label">Tap to attach a photo</div>
                  <div className="upload-hint">JPG, PNG or WEBP — max 10 MB</div>
                </>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          {preview && <button className="btn-ghost" style={{marginTop:8,alignSelf:"flex-start"}} onClick={()=>{setFile(null);setPreview(null);}}>✕ Remove photo</button>}
        </div>
      </div>
      <button className="btn-primary" style={{marginTop:8}} onClick={submit} disabled={busy||!title.trim()||!desc.trim()}>
        {busy ? <><div className="spinner"/>Submitting…</> : "Submit Issue"}
      </button>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function LoadingCards() {
  return Array.from({length:3}).map((_,i)=>(
    <div key={i} className="issue-card" style={{opacity:.6,pointerEvents:"none"}}>
      <div className="issue-accent" style={{background:"var(--parchment)"}}/>
      <div className="issue-body">
        {[100,70,90].map((w,j)=>(
          <div key={j} style={{background:"var(--parchment)",borderRadius:4,height:14,width:`${w}%`,margin:"8px 0",animation:"pulse 1.5s infinite"}}/>
        ))}
      </div>
    </div>
  ));
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty">
      <I n={icon} s={48} c="var(--text-muted)"/>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  );
}
