const $ = id => document.getElementById(id), cfg = window.RC_VERIFY || {};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const canonical = v => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? "[" + v.map(canonical).join(",") + "]" : "{" + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function sigOk(payload, sig) { try { const k = await crypto.subtle.importKey("raw", unb64(cfg.publicKey), { name:"Ed25519" }, false, ["verify"]); return await crypto.subtle.verify("Ed25519", k, unb64(sig), new TextEncoder().encode(canonical(payload))); } catch { return false; } }
const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ", CHK = A + "*~$=U";
function parseId(raw) { const m = String(raw).trim().toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").match(/^(RC[UFL])-([A-Z]{2})-([0-9A-Z]{5})-([0-9A-Z]{5})-([0-9A-Z*~$=])$/); if (!m) return "Format not recognised."; const b = m[3] + m[4]; let v = 0; for (const c of b) { if (!A.includes(c)) return "Invalid characters."; v = (v * 32 + A.indexOf(c)) % 37; } return CHK[v] === m[5] ? "ok:" + (m[1] === "RCU" ? "Farmer (user) ID" : m[1] === "RCF" ? "Farm ID" : "Unregistered local ID") + ", country " + m[2] : "The check character does not match. A character may be mistyped."; }
$("chk").onclick = () => { const r = parseId($("fid").value); $("idout").innerHTML = r.startsWith("ok:") ? "✅ Looks valid: " + esc(r.slice(3)) + ". This checks spelling only. Verify the farm with its passport." : "⚠️ " + esc(r); };
const stat = l => { if (!l.expiry) return ["p-n", "No expiry date"]; const d = Math.round((Date.parse(l.expiry) - Date.now()) / 864e5); return d < 0 ? ["p-bad", "Expired " + (-d) + " days ago"] : d <= 60 ? ["p-soon", "Expires in " + d + " days"] : ["p-ok", "Valid"]; };
const RV = { documents_checked:["p-ok", "Document checked by Recordance"], issuer_confirmed:["p-ok", "Confirmed with the issuing authority"], rejected:["p-bad", "Rejected on review"] };
async function verify(id) {
  const out = $("out");
  // A skeleton while the check runs, and plain words (never server text) if it cannot finish.
  out.innerHTML = '<div class="card" aria-busy="true"><span class="sr" role="status">Checking this passport…</span><span class="skb w4"></span><span class="skb w8"></span><span class="skb w6"></span><span class="skb w8"></span></div>';
  const say = t => { out.innerHTML = '<div class="verdict bad" role="alert">' + esc(t) + '</div>'; };
  if (navigator.onLine === false) return say("No internet. Connect to the internet to check this passport.");
  const WHY = { 400:"That is not a passport number. Check it and try again.", 404:"No passport was found with that number. Check it and try again.", 429:"Too many checks. Please wait a minute and try again." };
  let r; const ctl = typeof AbortController === "function" ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), 20000);
  try {
    const res = await fetch(cfg.functionsUrl + "/verify-passport?id=" + encodeURIComponent(id), ctl ? { signal:ctl.signal } : {});
    if (!res.ok) return say(WHY[res.status] || "This passport could not be checked right now. Please try again in a moment.");
    r = await res.json();
  } catch (e) { return say(e && e.name === "AbortError" ? "The internet is too slow right now. Please try again in a moment." : navigator.onLine === false ? "No internet. Connect to the internet to check this passport." : "This passport could not be checked right now. Please try again in a moment."); }
  finally { clearTimeout(t); }
  if (!r || !r.payload || !r.payload.snapshot) return say("This passport could not be checked right now. Please try again in a moment.");
  const good = await sigOk(r.payload, r.signature), p = r.payload, s = p.snapshot, vd = !good ? ["bad", "❌ Signature does not match. Do not rely on this passport."] : r.status === "revoked" ? ["bad", "❌ This passport has been revoked."] : r.status === "expired" ? ["warn", "⚠️ Genuine, but expired on " + p.expiresAt.slice(0, 10) + ". Ask the farm for a new one."] : ["ok", "✅ Genuine Recordance passport. Unchanged since it was issued."];
  const rev = new Map((r.currentReviews || []).map(x => [x.type + "|" + x.number, x]));
  const lic = (s.licences || []).map(l => { const [c, t] = stat(l), x = rev.get(l.type + "|" + l.number), rr = x && RV[x.status]; return "<tr><td>" + esc(l.type) + "<div class='note'>" + esc(l.number) + " · " + esc(l.issuer) + "</div></td><td>" + esc(l.expiry || "—") + "</td><td><span class='pill " + c + "'>" + t + "</span>" + (rr ? "<div style='margin-top:4px'><span class='pill " + rr[0] + "'>" + rr[1] + "</span><div class='note'>" + esc(x.by) + ", " + esc((x.at || "").slice(0, 10)) + "</div></div>" : "<div class='note'>Declared by the farm</div>") + "</td></tr>"; }).join("");
  const plots = (s.plots || []).map(q => "<tr><td>" + esc(q.name) + "</td><td>" + esc(q.crop) + "</td><td>" + esc(q.areaHa) + " ha</td><td class='mono'>" + (q.lat != null ? esc(q.lat) + ", " + esc(q.lng) : "No GPS") + "</td><td>" + (q.boundaryPoints ? q.boundaryPoints + " points" : "—") + "</td></tr>").join("");
  out.innerHTML = '<div class="verdict ' + vd[0] + '">' + vd[1] + '</div><div class="card"><h2 style="margin-top:0">' + esc(s.farmName || "Farm") + '</h2><div class="kv"><span>Holder</span><span>' + esc(s.holder) + '</span><span>Farm ID</span><span class="mono">' + esc(s.farmId) + '</span><span>User ID</span><span class="mono">' + esc(s.farmerId) + '</span><span>Location</span><span>' + esc([s.region, s.country].filter(Boolean).join(", ")) + '</span><span>Products</span><span>' + esc((s.products || []).join(", ") || "—") + '</span><span>Passport</span><span class="mono">' + esc(p.id) + '</span><span>Issued</span><span>' + esc(p.issuedAt.slice(0, 10)) + ", valid to " + esc(p.expiresAt.slice(0, 10)) + '</span></div></div>' +
    (s.licences ? '<div class="card"><h2 style="margin-top:0">Licences and certificates</h2><table><tr><th>Document</th><th>Expiry</th><th>Status</th></tr>' + (lic || "<tr><td colspan=3>None shared</td></tr>") + "</table></div>" : "") +
    (s.plots ? '<div class="card"><h2 style="margin-top:0">Plots</h2><table><tr><th>Plot</th><th>Crop</th><th>Size</th><th>GPS</th><th>Boundary</th></tr>' + (plots || "<tr><td colspan=5>None shared</td></tr>") + "</table></div>" : "") +
    (s.sprays ? '<div class="card"><h2 style="margin-top:0">Spray records</h2><p>' + s.sprays.entries + " spray entries. Harvests recorded before the waiting period ended: <b>" + s.sprays.harvestBeforeWaitingPeriod + "</b>.</p></div>" : "") +
    (s.records ? '<div class="card"><h2 style="margin-top:0">Record keeping</h2><p>' + s.records.monthsWithRecords + " months with records. Record strength " + s.records.strength + "/100. Last record " + esc(s.records.lastRecord || "—") + ".</p></div>" : "") +
    '<p class="note">Self-reported by the farm unless a document shows a Recordance review. <button class="g noprint" id="printbtn">Print</button></p>';
  const pb = $("printbtn"); if (pb) pb.onclick = () => print();
}
$("go").onclick = () => verify($("pid").value.trim());
const q = new URLSearchParams(location.search).get("id"); if (q) { $("pid").value = q; verify(q); }
