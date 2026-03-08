import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import appIcon from './icon.PNG'

// ============================================================
//  RKCSA MMS — Maintenance Management System
//  Replace the two lines below with your Supabase credentials
//  from: supabase.com → Project Settings → API
// ============================================================
var SUPABASE_URL = 'https://gbhcekypvbyxwnxpmznz.supabase.co'
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaGNla3lwdmJ5eHdueHBtem56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODU5ODIsImV4cCI6MjA4ODU2MTk4Mn0.8SakdvB-hua3ii8Cf52dXsaniGOLfA7lTX-nFKAoaA0'
// ============================================================

var supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

var STATUS_FLOW = ['New', 'In Progress', 'Pending / On Hold', 'Resolved / Closed']
var CATEGORIES = ['Structural', 'Electrical', 'Plumbing', 'Garden', 'Cleaning', 'Safety', 'Other']
var STATUS_COLORS = {
  'New':               { bg: '#FFF3E0', text: '#BF360C', dot: '#FF6D00' },
  'In Progress':       { bg: '#E8F4FD', text: '#0D47A1', dot: '#1976D2' },
  'Pending / On Hold': { bg: '#FFFDE7', text: '#F57F17', dot: '#F9A825' },
  'Resolved / Closed': { bg: '#E8F5E9', text: '#1B5E20', dot: '#388E3C' },
}

// ── Role helpers ──────────────────────────────────────────────
function isManagerOrAdmin(role) {
  return role === 'Admin' || role === 'Manager'
}
function isAdmin(role) {
  return role === 'Admin'
}

// ── Supabase helpers ──────────────────────────────────────────
var db = {
  signIn: function(email, password) {
    return supabase.auth.signInWithPassword({ email: email, password: password })
  },
  signOut: function() {
    return supabase.auth.signOut()
  },
  getProfile: function(id) {
    return supabase.from('profiles').select('*').eq('id', id).single()
  },
  getProfiles: function() {
    return supabase.from('profiles').select('*').order('full_name')
  },
  getIssues: function() {
    return supabase
      .from('issues')
      .select('*, reporter:reported_by(id,full_name,role), assignee:assigned_to(id,full_name,role), comments(count)')
      .order('created_at', { ascending: false })
  },
  createIssue: function(data) {
    return supabase.from('issues').insert(data).select().single()
  },
  updateIssue: function(id, data) {
    return supabase
      .from('issues')
      .update(data)
      .eq('id', id)
      .select('*, reporter:reported_by(id,full_name,role), assignee:assigned_to(id,full_name,role)')
      .single()
  },
  getComments: function(issueId) {
    return supabase
      .from('comments')
      .select('*, author:author_id(id,full_name,role)')
      .eq('issue_id', issueId)
      .order('created_at')
  },
  addComment: function(data) {
    return supabase
      .from('comments')
      .insert(data)
      .select('*, author:author_id(id,full_name,role)')
      .single()
  },
  uploadPhoto: async function(file) {
    var ext = file.name.split('.').pop()
    var path = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext
    var uploadResult = await supabase.storage.from('issue-photos').upload(path, file)
    if (uploadResult.error) throw uploadResult.error
    var urlResult = supabase.storage.from('issue-photos').getPublicUrl(path)
    return urlResult.data.publicUrl
  },
}

function fmt(iso) {
  if (!iso) return '—'
  var d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

// ── CSS ───────────────────────────────────────────────────────
var css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --cr:#8B1A1A;--cr-d:#5C0F0F;--cr-l:#C0392B;
  --go:#C9921A;--go-l:#E8B84B;--go-p:#FDF6E3;
  --cm:#FAF8F4;--pa:#F0EAD6;--bk:#2C1810;
  --wh:#FFFFFF;--bd:rgba(139,26,26,0.12);
  --sh:rgba(44,24,16,0.10);--sh2:rgba(44,24,16,0.20);
  --tx:#2C1810;--tm:#7A5C50;
  --fd:'Playfair Display',Georgia,serif;
  --fb:'Outfit',system-ui,sans-serif;
  --r:14px;--rs:8px;--rx:6px
}
body{font-family:var(--fb);background:var(--cm);color:var(--tx);line-height:1.5}
button,input,select,textarea{font-family:var(--fb)}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.fu{animation:fadeUp .3s ease both}
.spin{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.spin.dk{border-color:rgba(139,26,26,.2);border-top-color:var(--cr)}

.lp{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,var(--cr-d) 0%,var(--cr) 45%,var(--go) 100%);padding:24px}
.lc{background:var(--wh);border-radius:24px;padding:48px 40px;width:100%;max-width:420px;box-shadow:0 40px 100px rgba(0,0,0,.4);animation:fadeUp .5s ease}
.le{width:152px;height:152px;border-radius:50%;margin:0 auto 18px;background:linear-gradient(135deg,var(--cr-d),var(--cr-l));display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(139,26,26,.4)}
.lh{font-family:var(--fd);font-size:28px;font-weight:800;color:var(--bk);text-align:center}
.ls{font-size:13px;color:var(--tm);text-align:center;margin-top:4px}
.ld{border:none;border-top:1px solid var(--bd);margin:22px 0}
.fl{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--tm);margin-bottom:6px}
.fi{width:100%;padding:12px 15px;border:2px solid var(--bd);border-radius:var(--rs);font-size:15px;color:var(--tx);background:var(--cm);outline:none;transition:border-color .2s}
.fi:focus{border-color:var(--cr);background:var(--wh)}
.bp{width:100%;padding:13px;background:linear-gradient(135deg,var(--cr-d),var(--cr-l));color:#fff;border:none;border-radius:var(--rs);font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 18px rgba(139,26,26,.4);margin-top:6px}
.bp:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,26,26,.5)}
.bp:disabled{opacity:.6;cursor:not-allowed}
.bs{padding:10px 18px;background:transparent;border:2px solid var(--cr);color:var(--cr);border-radius:var(--rs);font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,color .15s;white-space:nowrap}
.bs:hover{background:var(--cr);color:#fff}
.bg{padding:8px 12px;background:transparent;border:none;color:var(--tm);font-size:13px;font-weight:500;cursor:pointer;border-radius:var(--rx);transition:background .15s}
.bg:hover{background:var(--pa)}
.er{background:#FEE;border:1px solid #FCC;color:#900;border-radius:var(--rs);padding:11px 14px;font-size:13px;margin-bottom:14px}
.ib{background:var(--go-p);border:1px solid rgba(201,146,26,.3);color:var(--bk);border-radius:var(--rs);padding:12px 14px;font-size:12px;margin-top:14px}
.ib strong{display:block;color:var(--go);margin-bottom:3px;font-size:11px;text-transform:uppercase;letter-spacing:.06em}

.lay{display:flex;min-height:100vh}
.sb{width:264px;background:var(--cr-d);min-height:100vh;display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto}
.sbh{padding:26px 20px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.sbl{width:88px;height:88px;border-radius:12px;background:linear-gradient(135deg,var(--go),var(--go-l));display:flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:0 4px 14px rgba(201,146,26,.4)}
.sbn{font-family:var(--fd);font-size:18px;font-weight:800;color:#fff;line-height:1.15}
.sbt{font-size:10px;color:rgba(255,255,255,.4);margin-top:3px;letter-spacing:.12em;text-transform:uppercase}
.nav{flex:1;padding:12px 8px;display:flex;flex-direction:column;gap:3px}
.nb{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:var(--rs);cursor:pointer;color:rgba(255,255,255,.5);font-size:14px;font-weight:500;border:none;background:transparent;width:100%;text-align:left;transition:background .15s,color .15s}
.nb:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.85)}
.nb.ac{background:rgba(201,146,26,.25);color:var(--go-l)}
.sbf{padding:15px 18px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:11px}
.av{width:36px;height:36px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--go),var(--cr-l));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff}
.un{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ur{font-size:11px;color:rgba(255,255,255,.4)}
.ib2{background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,.35);padding:4px;border-radius:var(--rx);transition:color .15s}
.ib2:hover{color:rgba(255,255,255,.8)}

.mn{flex:1;min-width:0;display:flex;flex-direction:column}
.tb{background:var(--wh);border-bottom:1px solid var(--bd);padding:16px 30px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.tbt{font-family:var(--fd);font-size:22px;font-weight:700;color:var(--bk)}
.tbs{font-size:12px;color:var(--tm);margin-top:2px}
.ct{flex:1;padding:30px;background:var(--cm)}

.card{background:var(--wh);border-radius:var(--r);border:1px solid var(--bd);box-shadow:0 2px 14px var(--sh)}
.cp{padding:22px 26px}
.ctt{font-family:var(--fd);font-size:17px;font-weight:700;color:var(--bk);margin-bottom:14px}

.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;margin-bottom:26px}
.sc{background:var(--wh);border-radius:var(--r);border:1px solid var(--bd);box-shadow:0 2px 14px var(--sh);padding:18px}
.sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--tm);margin-bottom:7px}
.sv{font-family:var(--fd);font-size:36px;font-weight:800;color:var(--bk);line-height:1}
.sp{display:inline-flex;align-items:center;gap:5px;margin-top:7px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px}
.dt{width:6px;height:6px;border-radius:50%;flex-shrink:0}

.tl{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.sr{flex:1;min-width:160px;padding:10px 14px;border:2px solid var(--bd);border-radius:var(--rs);font-size:14px;background:var(--wh);color:var(--tx);outline:none;transition:border-color .2s}
.sr:focus{border-color:var(--cr)}
.sl2{padding:10px 14px;border:2px solid var(--bd);border-radius:var(--rs);font-size:14px;background:var(--wh);color:var(--tx);outline:none;cursor:pointer}

.ic{background:var(--wh);border-radius:var(--r);border:1px solid var(--bd);box-shadow:0 2px 12px var(--sh);margin-bottom:10px;cursor:pointer;display:flex;overflow:hidden;transition:transform .15s,box-shadow .15s}
.ic:hover{transform:translateY(-2px);box-shadow:0 8px 28px var(--sh2)}
.ia{width:5px;flex-shrink:0}
.ib3{flex:1;padding:15px 18px}
.ir{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.irf{font-size:11px;font-weight:700;color:var(--tm);letter-spacing:.08em}
.itt{font-size:15px;font-weight:600;color:var(--bk);margin:3px 0 5px;line-height:1.3}
.idc{font-size:13px;color:var(--tm);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.im{display:flex;gap:12px;margin-top:9px;flex-wrap:wrap}
.mt{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--tm)}
.sb2{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap}
.cb{background:var(--pa);color:var(--bk);font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px}
.bgs{display:flex;gap:6px;flex-direction:column;align-items:flex-end;flex-shrink:0}

.dw{max-width:780px}
.bb{display:flex;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;color:var(--tm);font-size:14px;font-weight:500;padding:0;margin-bottom:20px;transition:color .15s}
.bb:hover{color:var(--cr)}
.dh{padding:24px 28px;border-bottom:1px solid var(--bd)}
.dr{font-size:11px;font-weight:700;color:var(--tm);letter-spacing:.1em;margin-bottom:7px}
.dt2{font-family:var(--fd);font-size:26px;font-weight:800;color:var(--bk);line-height:1.2;margin-bottom:12px}
.db{padding:24px 28px}
.secl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--tm);margin-bottom:7px}
.dtext{font-size:15px;line-height:1.7;color:var(--tx)}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:4px}
.iv{font-size:14px;font-weight:500;color:var(--tx);margin-top:3px}
.pb{border-radius:var(--rs);overflow:hidden;background:var(--pa);min-height:170px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px}
.pb img{width:100%;height:auto;display:block}
.pbn{color:var(--tm);font-size:13px}

.ss{display:flex;margin-bottom:16px}
.seg{flex:1;padding:10px 5px;text-align:center;font-size:11px;font-weight:700;cursor:pointer;border:2px solid var(--bd);background:var(--cm);color:var(--tm);transition:all .15s;position:relative;letter-spacing:.02em}
.seg:first-child{border-radius:var(--rs) 0 0 var(--rs)}
.seg:last-child{border-radius:0 var(--rs) var(--rs) 0}
.seg:not(:first-child){margin-left:-2px}
.seg.on{background:var(--cr);border-color:var(--cr);color:#fff;z-index:1}
.seg:hover:not(.on){background:var(--pa);color:var(--bk)}

.cl{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
.cm{display:flex;gap:11px}
.cav{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--go),var(--cr-l));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff}
.cbub{background:var(--pa);border-radius:0 var(--rs) var(--rs) var(--rs);padding:11px 13px;flex:1}
.cau{font-size:12px;font-weight:700;color:var(--bk)}
.ctm{font-size:11px;color:var(--tm);margin-left:7px}
.ctx{font-size:14px;color:var(--tx);margin-top:3px;line-height:1.5}
.crow{display:flex;gap:9px}
.cin{flex:1;padding:10px 13px;border:2px solid var(--bd);border-radius:var(--rs);font-size:14px;background:var(--cm);color:var(--tx);outline:none;resize:none;transition:border-color .2s}
.cin:focus{border-color:var(--cr)}

.fc{background:var(--wh);border-radius:var(--r);border:1px solid var(--bd);box-shadow:0 4px 20px var(--sh);padding:34px;max-width:640px}
.ftt{font-family:var(--fd);font-size:25px;font-weight:800;color:var(--bk);margin-bottom:5px}
.fsb{font-size:13px;color:var(--tm);margin-bottom:26px}
.fgr{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ff{display:flex;flex-direction:column;margin-bottom:2px}
.ff.fu2{grid-column:1/-1}
.fta{padding:12px 15px;border:2px solid var(--bd);border-radius:var(--rs);font-size:15px;background:var(--cm);color:var(--tx);outline:none;resize:vertical;min-height:105px;transition:border-color .2s}
.fta:focus{border-color:var(--cr)}
.uz{border:2px dashed var(--bd);border-radius:var(--rs);padding:34px 18px;text-align:center;cursor:pointer;transition:all .2s;background:var(--cm)}
.uz:hover{border-color:var(--cr);background:rgba(139,26,26,.03)}
.uz.fi2{padding:0;overflow:hidden;border-style:solid;border-color:var(--go)}
.uz img{width:100%;height:auto;display:block}
.ul{font-size:14px;font-weight:500;color:var(--tm);margin-top:9px}
.uh{font-size:12px;color:var(--tm);margin-top:3px}
.ok{background:#E8F5E9;border:1px solid #A5D6A7;color:#1B5E20;border-radius:var(--rs);padding:13px 17px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:9px;margin-bottom:20px;animation:fadeIn .3s}
.cl2{font-size:11px;color:var(--tm);text-align:right;margin-top:3px}

.em{text-align:center;padding:60px 20px}
.et{font-family:var(--fd);font-size:19px;font-weight:700;color:var(--bk);margin:13px 0 5px}
.es{font-size:14px;color:var(--tm)}

.cb2{background:linear-gradient(135deg,#1A0A00,#2C1810);color:#fff;padding:18px 24px;border-radius:var(--r);margin-bottom:22px;border-left:4px solid var(--go)}
.cb2 h3{font-family:var(--fd);font-size:17px;font-weight:700;color:var(--go-l);margin-bottom:7px}
.cb2 p{font-size:13px;color:rgba(255,255,255,.7);line-height:1.6}
.cb2 code{background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;font-size:12px;color:var(--go-l)}

.pl{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:var(--cr-d);gap:14px}
.pli{width:136px;height:136px;border-radius:18px;background:linear-gradient(135deg,var(--go),var(--go-l));display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(201,146,26,.5);animation:pulse 2s infinite}
.plt{font-family:var(--fd);font-size:19px;font-weight:700;color:rgba(255,255,255,.8)}

.bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--cr-d);border-top:1px solid rgba(255,255,255,.1);z-index:100;padding:0}
.bnav-inner{display:flex;align-items:stretch}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:10px 4px;background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,.5);font-size:10px;font-weight:600;transition:color .15s;letter-spacing:.03em;border-top:2px solid transparent}
.bnav-btn.ac{color:var(--go-l);border-top-color:var(--go-l)}
.bnav-btn:hover{color:rgba(255,255,255,.85)}
.bnav-btn.new-btn{color:#fff;background:var(--cr);margin:8px 6px;border-radius:var(--rs);border-top:none;flex:1.2}

@media(max-width:768px){
  .sb{display:none}
  .bnav{display:block}
  .ct{padding:14px;padding-bottom:90px}
  .tb{padding:12px 16px}
  .fgr{grid-template-columns:1fr}
  .ig{grid-template-columns:1fr}
  .sg{grid-template-columns:1fr 1fr}
  .seg{font-size:9px;padding:8px 2px}
  .mn{padding-bottom:0}
}
`

// ── SVG Icons ─────────────────────────────────────────────────
function Icon(props) {
  var name = props.name
  var size = props.size || 18
  var color = props.color || 'currentColor'
  var paths = {
    shield:  ['M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z'],
    list:    ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'M9 5a2 2 0 002 2h2a2 2 0 002-2', 'M9 5a2 2 0 012-2h2a2 2 0 012 2'],
    grid:    ['M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5z', 'M14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z', 'M4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z', 'M14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z'],
    plus:    ['M12 4v16', 'M4 12h16'],
    user:    ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 3a4 4 0 100 8 4 4 0 000-8z'],
    logout:  ['M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'],
    back:    ['M15 19l-7-7 7-7'],
    camera:  ['M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', 'M15 13a3 3 0 11-6 0 3 3 0 016 0z'],
    msg:     ['M8 12h.01', 'M12 12h.01', 'M16 12h.01', 'M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'],
    check:   ['M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'],
    clock:   ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
    img:     ['M4 16l4.586-4.586a2 2 0 012.828 0L16 16', 'M14 14l1.586-1.586a2 2 0 012.828 0L20 14', 'M6 10h.01', 'M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'],
    assign:  ['M17 20h5v-2a3 3 0 00-5.356-1.857', 'M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857', 'M7 20H2v-2a3 3 0 015.356-1.857', 'M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0', 'M15 7a3 3 0 11-6 0 3 3 0 016 0z'],
    wrench:  ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
  }
  var d = paths[name] || []
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.map(function(p, i) { return <path key={i} d={p} /> })}
    </svg>
  )
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  var [session, setSession] = useState(null)
  var [profile, setProfile] = useState(null)
  var [loading, setLoading] = useState(true)
  var [view, setView] = useState('dashboard')
  var [allIssues, setAllIssues] = useState([])
  var [profiles, setProfiles] = useState([])
  var [selectedId, setSelectedId] = useState(null)
  var [issuesLoading, setIssuesLoading] = useState(false)
  var [statusFilter, setStatusFilter] = useState('All')
  var configured = SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co'

  // ── Derive visible issues from profile + allIssues together ──
  // This runs every time EITHER profile OR allIssues changes,
  // so there is no race condition between the two loading.
  var issues = allIssues.filter(function(i) {
    if (!profile) return false
    if (isManagerOrAdmin(profile.role) || profile.role === 'Technician') return true
    // Reporter: only their own issues
    return i.reported_by === profile.id
  })

  useEffect(function() {
    supabase.auth.getSession().then(function(result) {
      var s = result.data.session
      setSession(s)
      if (s) { loadProfile(s.user.id) } else { setLoading(false) }
    })
    var sub = supabase.auth.onAuthStateChange(function(_e, s) {
      setSession(s)
      if (s) { loadProfile(s.user.id) } else { setProfile(null); setLoading(false) }
    })
    return function() { sub.data.subscription.unsubscribe() }
  }, [])

  function loadProfile(id) {
    db.getProfile(id).then(function(result) {
      setProfile(result.data)
      setLoading(false)
    })
  }

  useEffect(function() {
    if (!session) return
    loadIssues()
    loadProfiles()
  }, [session])

  function loadIssues() {
    setIssuesLoading(true)
    db.getIssues().then(function(result) {
      setAllIssues(result.data || [])
      setIssuesLoading(false)
    })
  }

  function loadProfiles() {
    db.getProfiles().then(function(result) {
      setProfiles(result.data || [])
    })
  }

  function openIssue(id) { setSelectedId(id); setView('detail') }
  function navigate(v) { setView(v); setSelectedId(null) }
  function navigateFiltered(status) { setStatusFilter(status); setView('issues'); setSelectedId(null) }

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="pl">
          <div className="pli"><img src={appIcon} alt="RKCSA MMS" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} /></div>
          <div className="plt">RKCSA MMS</div>
          <div className="spin" />
        </div>
      </>
    )
  }

  if (!session || !profile) {
    return (
      <>
        <style>{css}</style>
        <LoginScreen configured={configured} onLogin={function() { loadIssues(); loadProfiles() }} />
      </>
    )
  }

  var selectedIssue = issues.find(function(i) { return i.id === selectedId })

  return (
    <>
      <style>{css}</style>
      <div className="lay">
        <Sidebar profile={profile} view={view} navigate={navigate} onLogout={function() { db.signOut() }} />
        <div className="mn">
          <Topbar view={view} issue={selectedIssue} onLogout={function() { db.signOut() }} />
          <div className="ct">
            {!configured && <ConfigBanner />}
            {view === 'dashboard' && <Dashboard issues={issues} loading={issuesLoading} openIssue={openIssue} navigate={navigate} navigateFiltered={navigateFiltered} />}
            {view === 'issues' && <IssuesList issues={issues} loading={issuesLoading} openIssue={openIssue} initialStatus={statusFilter} />}
            {view === 'new' && <NewIssueForm profile={profile} profiles={profiles} onSuccess={function() { loadIssues(); navigate('issues') }} />}
            {view === 'users' && isAdmin(profile.role) && <ManageUsers profiles={profiles} onRefresh={loadProfiles} />}
            {view === 'detail' && selectedIssue && (
              <IssueDetail
                issue={selectedIssue}
                profile={profile}
                profiles={profiles}
                onBack={function() { navigate('issues') }}
                onUpdate={function(updated) {
                  setAllIssues(function(prev) { return prev.map(function(i) { return i.id === updated.id ? updated : i }) })
                  setSelectedId(updated.id)
                }}
              />
            )}
          </div>
          <BottomNav view={view} navigate={navigate} />
        </div>
      </div>
    </>
  )
}

// ── Config Banner ─────────────────────────────────────────────
function ConfigBanner() {
  return (
    <div className="cb2">
      <h3>Supabase Not Yet Connected</h3>
      <p>Replace <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> at the top of App.jsx with your credentials from <strong>supabase.com → Project Settings → API</strong>, then redeploy.</p>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────
function LoginScreen(props) {
  var configured = props.configured
  var onLogin = props.onLogin
  var [email, setEmail] = useState('')
  var [password, setPassword] = useState('')
  var [error, setError] = useState('')
  var [busy, setBusy] = useState(false)

  function submit() {
    setError(''); setBusy(true)
    db.signIn(email.trim(), password).then(function(result) {
      if (result.error) { setError(result.error.message); setBusy(false) }
      else { onLogin() }
    })
  }

  return (
    <div className="lp">
      <div className="lc">
        <div className="le" style={{ background: 'transparent', boxShadow: 'none', padding: 0, overflow: 'hidden' }}><img src={appIcon} alt="RKCSA MMS" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
        <div className="lh">RKCSA MMS</div>
        <div className="ls">Maintenance Management System</div>
        <hr className="ld" />
        {error && <div className="er">{error}</div>}
        {!configured && <div className="er">Supabase not configured. Update SUPABASE_URL and SUPABASE_ANON_KEY in App.jsx</div>}
        <div style={{ marginBottom: 16 }}>
          <label className="fl">Email Address</label>
          <input className="fi" type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') submit() }} placeholder="your@email.com" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="fl">Password</label>
          <input className="fi" type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') submit() }} placeholder="••••••••" />
        </div>
        <button className="bp" onClick={submit} disabled={busy || !email || !password}>
          {busy ? <><div className="spin" /> Signing in…</> : 'Sign In'}
        </button>
        <div className="ib">
          <strong>How to add users</strong>
          Supabase → Authentication → Users → Invite User. Enter their email and they will receive a setup link.
        </div>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar(props) {
  var profile = props.profile
  var view = props.view
  var navigate = props.navigate
  var onLogout = props.onLogout
  var nav = [
    { id: 'dashboard', label: 'Dashboard',    icon: 'grid'   },
    { id: 'issues',    label: 'All Issues',   icon: 'list'   },
    { id: 'new',       label: 'Log New Issue',icon: 'plus'   },
  ]
  if (isAdmin(profile.role)) {
    nav.push({ id: 'users', label: 'Manage Users', icon: 'assign' })
  }
  return (
    <aside className="sb">
      <div className="sbh">
        <div className="sbl" style={{ background: 'transparent', boxShadow: 'none', padding: 2, overflow: 'hidden' }}><img src={appIcon} alt="RKCSA MMS" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /></div>
        <div className="sbn">RKCSA MMS</div>
        <div className="sbt">Maintenance System</div>
      </div>
      <nav className="nav">
        {nav.map(function(item) {
          return (
            <button key={item.id} className={'nb' + (view === item.id ? ' ac' : '')} onClick={function() { navigate(item.id) }}>
              <Icon name={item.icon} size={17} color="currentColor" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="sbf">
        <div className="av">{profile.full_name.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="un">{profile.full_name}</div>
          <div className="ur">{profile.role}</div>
        </div>
        <button className="ib2" onClick={onLogout} title="Sign out"><Icon name="logout" size={15} /></button>
      </div>
    </aside>
  )
}

// ── Topbar ────────────────────────────────────────────────────
function Topbar(props) {
  var view = props.view
  var issue = props.issue
  var onLogout = props.onLogout
  var map = {
    dashboard: { title: 'Dashboard',      sub: 'Overview of all maintenance issues'  },
    issues:    { title: 'All Issues',     sub: 'Browse and manage reported issues'   },
    new:       { title: 'Log New Issue',  sub: 'Report a new maintenance problem'    },
    users:     { title: 'Manage Users',   sub: 'View and update user roles'          },
    detail:    { title: issue ? issue.ref_no : 'Issue', sub: issue ? issue.title : '' },
  }
  var t = map[view] || map.dashboard
  return (
    <div className="tb">
      <div>
        <div className="tbt">{t.title}</div>
        <div className="tbs">{t.sub}</div>
      </div>
      <button className="bs" style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, padding:'8px 14px' }} onClick={onLogout}>
        <Icon name="logout" size={15} color="currentColor" /> Sign Out
      </button>
    </div>
  )
}

// ── Bottom Nav (mobile only) ──────────────────────────────────
function BottomNav(props) {
  var view = props.view
  var navigate = props.navigate
  var nav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid'   },
    { id: 'issues',    label: 'Issues',    icon: 'list'   },
    { id: 'new',       label: '+ Log Issue', icon: 'plus' },
  ]
  return (
    <div className="bnav">
      <div className="bnav-inner">
        {nav.map(function(item) {
          var isNew = item.id === 'new'
          return (
            <button
              key={item.id}
              className={'bnav-btn' + (view === item.id ? ' ac' : '') + (isNew ? ' new-btn' : '')}
              onClick={function() { navigate(item.id) }}
            >
              <Icon name={item.icon} size={isNew ? 20 : 18} color="currentColor" />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}


function Dashboard(props) {
  var issues = props.issues
  var loading = props.loading
  var openIssue = props.openIssue
  var navigate = props.navigate
  var navigateFiltered = props.navigateFiltered
  var counts = {}
  STATUS_FLOW.forEach(function(s) { counts[s] = issues.filter(function(i) { return i.status === s }).length })
  var recent = issues.slice(0, 5)
  return (
    <div className="fu">
      <div className="sg">
        {STATUS_FLOW.map(function(s) {
          var c = STATUS_COLORS[s]
          return (
            <div
              key={s}
              className="sc"
              onClick={function() { navigateFiltered(s) }}
              style={{ cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(44,24,16,0.18)' }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div className="sl">{s}</div>
              <div className="sv">{counts[s]}</div>
              <div className="sp" style={{ background: c.bg, color: c.text }}>
                <div className="dt" style={{ background: c.dot }} />
                {counts[s] === 1 ? 'issue' : 'issues'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tm)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                View <Icon name="back" size={10} color="var(--tm)" />
              </div>
            </div>
          )
        })}
        <div
          className="sc"
          onClick={function() { navigateFiltered('All') }}
          style={{ cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
          onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(44,24,16,0.18)' }}
          onMouseLeave={function(e) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
        >
          <div className="sl">Total</div>
          <div className="sv">{issues.length}</div>
          <div className="sp" style={{ background: 'var(--pa)', color: 'var(--bk)' }}>all time</div>
          <div style={{ fontSize: 11, color: 'var(--tm)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <Icon name="back" size={10} color="var(--tm)" />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 19, fontWeight: 700, color: 'var(--bk)' }}>Recent Issues</div>
        <button className="bs" onClick={function() { navigateFiltered('All') }}>View All</button>
      </div>
      {loading && <LoadingCards />}
      {!loading && recent.map(function(issue) { return <IssueCard key={issue.id} issue={issue} onClick={function() { openIssue(issue.id) }} /> })}
      {!loading && issues.length === 0 && <EmptyState title="No issues yet" sub="Log the first maintenance issue to get started." />}
    </div>
  )
}

// ── Issues List ───────────────────────────────────────────────
function IssuesList(props) {
  var issues = props.issues
  var loading = props.loading
  var openIssue = props.openIssue
  var initialStatus = props.initialStatus || 'All'
  var [q, setQ] = useState('')
  var [st, setSt] = useState(initialStatus)
  var [cat, setCat] = useState('All')

  var filtered = issues.filter(function(i) {
    var mq = !q || i.title.toLowerCase().includes(q.toLowerCase()) || i.ref_no.toLowerCase().includes(q.toLowerCase()) || i.description.toLowerCase().includes(q.toLowerCase())
    var ms = st === 'All' || i.status === st
    var mc = cat === 'All' || i.category === cat
    return mq && ms && mc
  })

  return (
    <div className="fu">
      <div className="tl">
        <input className="sr" placeholder="Search issues or reference numbers…" value={q} onChange={function(e) { setQ(e.target.value) }} />
        <select className="sl2" value={st} onChange={function(e) { setSt(e.target.value) }}>
          <option value="All">All Statuses</option>
          {STATUS_FLOW.map(function(s) { return <option key={s} value={s}>{s}</option> })}
        </select>
        <select className="sl2" value={cat} onChange={function(e) { setCat(e.target.value) }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
        </select>
      </div>
      {loading && <LoadingCards />}
      {!loading && filtered.length === 0 && <EmptyState title="No issues found" sub="Try adjusting your search or filters." />}
      {!loading && filtered.map(function(issue) { return <IssueCard key={issue.id} issue={issue} onClick={function() { openIssue(issue.id) }} /> })}
    </div>
  )
}

// ── Issue Card ────────────────────────────────────────────────
function IssueCard(props) {
  var issue = props.issue
  var onClick = props.onClick
  var c = STATUS_COLORS[issue.status] || STATUS_COLORS['New']
  var commentCount = 0
  if (issue.comments && issue.comments[0] && issue.comments[0].count !== undefined) {
    commentCount = issue.comments[0].count
  } else if (issue.comments) {
    commentCount = issue.comments.length
  }
  return (
    <div className="ic fu" onClick={onClick}>
      <div className="ia" style={{ background: c.dot }} />
      <div className="ib3">
        <div className="ir">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="irf">{issue.ref_no}</div>
            <div className="itt">{issue.title}</div>
            <div className="idc">{issue.description}</div>
          </div>
          <div className="bgs">
            <div className="sb2" style={{ background: c.bg, color: c.text }}>
              <div className="dt" style={{ background: c.dot }} />{issue.status}
            </div>
            <div className="cb">{issue.category}</div>
          </div>
        </div>
        <div className="im">
          <div className="mt"><Icon name="user" size={12} />{issue.reporter ? issue.reporter.full_name : 'Unknown'}</div>
          {issue.assignee && <div className="mt"><Icon name="assign" size={12} />{issue.assignee.full_name}</div>}
          <div className="mt"><Icon name="clock" size={12} />{fmt(issue.created_at)}</div>
          <div className="mt"><Icon name="msg" size={12} />{commentCount} comment{commentCount !== 1 ? 's' : ''}</div>
          {issue.image_url && <div className="mt"><Icon name="img" size={12} />Photo</div>}
        </div>
      </div>
    </div>
  )
}

// ── Issue Detail ──────────────────────────────────────────────
function IssueDetail(props) {
  var issue = props.issue
  var profile = props.profile
  var profiles = props.profiles
  var onBack = props.onBack
  var onUpdate = props.onUpdate
  var [comments, setComments] = useState([])
  var [newComment, setNewComment] = useState('')
  var [assignedTo, setAssignedTo] = useState(issue.assigned_to || '')
  var [saving, setSaving] = useState(false)
  var [commBusy, setCommBusy] = useState(false)
  var [commLoading, setCommLoading] = useState(true)

  useEffect(function() {
    db.getComments(issue.id).then(function(result) {
      setComments(result.data || [])
      setCommLoading(false)
    })
  }, [issue.id])

  if (!issue) return null
  var c = STATUS_COLORS[issue.status] || STATUS_COLORS['New']

  function changeStatus(newStatus) {
    if (newStatus === issue.status) return
    setSaving(true)
    db.updateIssue(issue.id, { status: newStatus }).then(function(result) {
      if (!result.error) onUpdate(result.data)
      setSaving(false)
    })
  }

  function saveAssignment() {
    setSaving(true)
    db.updateIssue(issue.id, { assigned_to: assignedTo || null }).then(function(result) {
      if (!result.error) onUpdate(result.data)
      setSaving(false)
    })
  }

  function postComment() {
    if (!newComment.trim()) return
    setCommBusy(true)
    db.addComment({ issue_id: issue.id, author_id: profile.id, text: newComment.trim() }).then(function(result) {
      if (!result.error) { setComments(function(prev) { return prev.concat([result.data]) }); setNewComment('') }
      setCommBusy(false)
    })
  }

  return (
    <div className="dw fu">
      <button className="bb" onClick={onBack}><Icon name="back" size={17} /> Back to Issues</button>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="dh">
          <div className="dr">{issue.ref_no}</div>
          <div className="dt2">{issue.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="sb2" style={{ background: c.bg, color: c.text }}>
              <div className="dt" style={{ background: c.dot }} />{issue.status}
            </div>
            <div className="cb">{issue.category}</div>
          </div>
        </div>
        <div className="db">
          <div style={{ marginBottom: 20 }}>
            <div className="secl">Photo</div>
            <div className="pb">
              {issue.image_url
                ? <img src={issue.image_url} alt="Issue" />
                : <><Icon name="camera" size={26} color="var(--tm)" /><div className="pbn">No photo attached</div></>
              }
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="secl">Description</div>
            <div className="dtext">{issue.description}</div>
          </div>
          <div className="ig">
            <div><div className="secl">Reported By</div><div className="iv">{issue.reporter ? issue.reporter.full_name : '—'}</div></div>
            <div><div className="secl">Assigned To</div><div className="iv">{issue.assignee ? issue.assignee.full_name : <span style={{ color: 'var(--tm)', fontStyle: 'italic' }}>Unassigned</span>}</div></div>
            <div><div className="secl">Logged On</div><div className="iv">{fmt(issue.created_at)}</div></div>
            <div><div className="secl">Last Updated</div><div className="iv">{fmt(issue.updated_at)}</div></div>
          </div>
        </div>
      </div>

      <div className="card cp" style={{ marginBottom: 16 }}>
        <div className="ctt">Update Status {saving && <span className="spin dk" style={{ marginLeft: 8 }} />}</div>
        {isManagerOrAdmin(profile.role) ? (
          <>
            <div className="ss">
              {STATUS_FLOW.map(function(s) {
                return <div key={s} className={'seg' + (issue.status === s ? ' on' : '')} onClick={function() { changeStatus(s) }}>{s}</div>
              })}
            </div>
            <div>
              <div className="secl" style={{ marginBottom: 8 }}>Assign To</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="sl2" style={{ flex: 1 }} value={assignedTo} onChange={function(e) { setAssignedTo(e.target.value) }}>
                  <option value="">— Unassigned —</option>
                  {profiles.map(function(p) { return <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option> })}
                </select>
                <button className="bs" onClick={saveAssignment} disabled={saving}>Save</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: 'var(--pa)', borderRadius: 'var(--rs)', padding: '14px 16px', fontSize: 13, color: 'var(--tm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" size={15} color="var(--tm)" />
            Only Managers and Admins can change the status or assignment of issues.
          </div>
        )}
      </div>

      <div className="card cp">
        <div className="ctt">Comments ({comments.length})</div>
        {commLoading && <div style={{ textAlign: 'center', padding: '18px 0' }}><div className="spin dk" /></div>}
        {!commLoading && comments.length === 0 && <div style={{ color: 'var(--tm)', fontSize: 13, marginBottom: 14 }}>No comments yet.</div>}
        {!commLoading && comments.length > 0 && (
          <div className="cl">
            {comments.map(function(cm) {
              return (
                <div key={cm.id} className="cm">
                  <div className="cav">{cm.author ? cm.author.full_name.charAt(0).toUpperCase() : '?'}</div>
                  <div className="cbub">
                    <span className="cau">{cm.author ? cm.author.full_name : 'Unknown'}</span>
                    <span className="ctm">{fmt(cm.created_at)}</span>
                    <div className="ctx">{cm.text}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="crow">
          <textarea className="cin" rows={2} placeholder="Add a comment…" value={newComment} onChange={function(e) { setNewComment(e.target.value) }} />
          <button className="bp" style={{ width: 'auto', padding: '10px 18px', alignSelf: 'flex-end' }} onClick={postComment} disabled={commBusy || !newComment.trim()}>
            {commBusy ? <div className="spin" /> : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Issue Form ────────────────────────────────────────────
function NewIssueForm(props) {
  var profile = props.profile
  var profiles = props.profiles
  var onSuccess = props.onSuccess
  var [title, setTitle] = useState('')
  var [desc, setDesc] = useState('')
  var [cat, setCat] = useState('Other')
  var [assignTo, setAssignTo] = useState('')
  var [file, setFile] = useState(null)
  var [preview, setPreview] = useState(null)
  var [busy, setBusy] = useState(false)
  var [success, setSuccess] = useState(false)
  var [error, setError] = useState('')
  var fileRef = useRef()

  function handleFile(e) {
    var f = e.target.files[0]
    if (!f) return
    setFile(f)
    var r = new FileReader()
    r.onload = function(ev) { setPreview(ev.target.result) }
    r.readAsDataURL(f)
  }

  function submit() {
    if (!title.trim() || !desc.trim()) return
    setError(''); setBusy(true)
    var doSubmit = async function() {
      try {
        var image_url = null
        if (file) image_url = await db.uploadPhoto(file)
        var result = await db.createIssue({
          title: title.trim(),
          description: desc.trim(),
          category: cat,
          reported_by: profile.id,
          assigned_to: assignTo || null,
          image_url: image_url,
        })
        if (result.error) throw result.error
        setSuccess(true)
        setTimeout(function() { onSuccess() }, 1400)
      } catch(e) {
        setError(e.message || 'Something went wrong. Please try again.')
        setBusy(false)
      }
    }
    doSubmit()
  }

  return (
    <div className="fc fu">
      <div className="ftt">Report a Maintenance Issue</div>
      <div className="fsb">Document a problem found at the ashram so it can be tracked and resolved.</div>
      {success && <div className="ok"><Icon name="check" size={17} color="#2E7D32" /> Issue logged successfully! Redirecting…</div>}
      {error && <div className="er" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="fgr">
        <div className="ff fu2">
          <label className="fl">Issue Title *</label>
          <input className="fi" value={title} onChange={function(e) { setTitle(e.target.value) }} placeholder="e.g. Broken tile near main entrance" maxLength={120} />
          <div className="cl2">{title.length}/120</div>
        </div>
        <div className="ff">
          <label className="fl">Category</label>
          <select className="fi" value={cat} onChange={function(e) { setCat(e.target.value) }}>
            {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
          </select>
        </div>
        <div className="ff">
          <label className="fl">Assign To (optional)</label>
          <select className="fi" value={assignTo} onChange={function(e) { setAssignTo(e.target.value) }}>
            <option value="">— Unassigned —</option>
            {profiles.map(function(p) { return <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option> })}
          </select>
        </div>
        <div className="ff fu2">
          <label className="fl">Description *</label>
          <textarea className="fta" value={desc} onChange={function(e) { setDesc(e.target.value) }} placeholder="Describe the issue — exact location, severity, what you observed…" maxLength={1000} />
          <div className="cl2">{desc.length}/1000</div>
        </div>
        <div className="ff fu2">
          <label className="fl">Photo (optional) — tap the box below to attach</label>
          <div className={'uz' + (preview ? ' fi2' : '')} onClick={function() { fileRef.current.click() }}>
            {preview
              ? <img src={preview} alt="Preview" />
              : <><Icon name="camera" size={30} color="var(--tm)" /><div className="ul">Tap / Click here to attach a photo</div><div className="uh">JPG, PNG or WEBP — max 10MB</div></>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          {preview && <button className="bg" style={{ marginTop: 7, alignSelf: 'flex-start' }} onClick={function() { setFile(null); setPreview(null) }}>✕ Remove photo</button>}
        </div>
      </div>
      <button className="bp" style={{ marginTop: 10 }} onClick={submit} disabled={busy || !title.trim() || !desc.trim()}>
        {busy ? <><div className="spin" /> Submitting…</> : 'Submit Issue'}
      </button>
      {(!title.trim() || !desc.trim()) && (
        <div style={{ fontSize: 12, color: 'var(--tm)', marginTop: 8, textAlign: 'center' }}>
          ⚠️ Please fill in the Issue Title and Description to submit
        </div>
      )}
    </div>
  )
}

// ── Manage Users (Admin only) ─────────────────────────────────
function ManageUsers(props) {
  var profiles = props.profiles
  var onRefresh = props.onRefresh
  var [saving, setSaving] = useState(null)
  var [saved, setSaved] = useState(null)

  function updateRole(userId, newRole) {
    setSaving(userId)
    supabase.from('profiles').update({ role: newRole }).eq('id', userId).then(function(result) {
      setSaving(null)
      if (!result.error) {
        setSaved(userId)
        onRefresh()
        setTimeout(function() { setSaved(null) }, 2000)
      }
    })
  }

  var roleOptions = ['Admin', 'Manager', 'Technician', 'Reporter']
  var roleColors = {
    'Admin':      { bg: '#F3E5F5', text: '#6A1B9A' },
    'Manager':    { bg: '#E3F2FD', text: '#0D47A1' },
    'Technician': { bg: '#E8F5E9', text: '#1B5E20' },
    'Reporter':   { bg: '#FFF3E0', text: '#BF360C' },
  }

  return (
    <div className="fu" style={{ maxWidth: 640 }}>
      <div className="card cp" style={{ marginBottom: 16 }}>
        <div style={{ background: 'var(--go-p)', border: '1px solid rgba(201,146,26,.3)', borderRadius: 'var(--rs)', padding: '12px 16px', fontSize: 13, color: 'var(--bk)', marginBottom: 20 }}>
          <strong>Admin only.</strong> To add new users, go to Supabase → Authentication → Users → Create new user. Their profile will appear here automatically.
        </div>
        {profiles.length === 0 && <EmptyState title="No users found" sub="No profiles in the database yet." />}
        {profiles.map(function(p) {
          var rc = roleColors[p.role] || roleColors['Reporter']
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--bd)' }}>
              <div className="av" style={{ width: 40, height: 40, fontSize: 15, flexShrink: 0 }}>{p.full_name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bk)' }}>{p.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--tm)', marginTop: 2 }}>{p.id.slice(0, 8)}…</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="sl2"
                  style={{ fontSize: 13, padding: '7px 10px', background: rc.bg, color: rc.text, borderColor: rc.bg, fontWeight: 600 }}
                  value={p.role}
                  onChange={function(e) { updateRole(p.id, e.target.value) }}
                  disabled={saving === p.id}
                >
                  {roleOptions.map(function(r) { return <option key={r} value={r}>{r}</option> })}
                </select>
                {saving === p.id && <div className="spin dk" />}
                {saved === p.id && <Icon name="check" size={16} color="#388E3C" />}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tm)', textAlign: 'center' }}>
        Role changes take effect immediately on next login.
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function LoadingCards() {
  return [0, 1, 2].map(function(i) {
    return (
      <div key={i} className="ic" style={{ opacity: 0.55, pointerEvents: 'none' }}>
        <div className="ia" style={{ background: 'var(--pa)' }} />
        <div className="ib3">
          {[100, 70, 85].map(function(w, j) {
            return <div key={j} style={{ background: 'var(--pa)', borderRadius: 4, height: 13, width: w + '%', margin: '7px 0', animation: 'pulse 1.5s infinite' }} />
          })}
        </div>
      </div>
    )
  })
}

function EmptyState(props) {
  return (
    <div className="em">
      <Icon name="list" size={44} color="var(--tm)" />
      <div className="et">{props.title}</div>
      <div className="es">{props.sub}</div>
    </div>
  )
}
