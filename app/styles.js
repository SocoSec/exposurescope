// app/styles.js
// The stylesheet, moved out of page.js unchanged, plus rules for the MVP additions.
// Kept as one string injected by <style> so the app still needs no CSS build step.

export const STYLE = `
.x-root{--bg:#080B12;--card:#0F1521;--card2:#131B29;--line:#1C2636;--ink:#DBE4F1;--mute:#67748B;
  --sig:#38C89A;--amber:#E6B057;--coral:#E56A5A;
  /* Tokens added with the trust layer. The signal colour is used at low alpha
     for surfaces so "secure" reads as calm, not as a wall of green. */
  --sig-dim:rgba(56,200,154,.10);--sig-edge:rgba(56,200,154,.22);
  --lift:linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,0));
  --shadow:0 18px 40px -26px rgba(0,0,0,.9);
  background:var(--bg);color:var(--ink);min-height:100vh;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  display:flex;align-items:flex-start;justify-content:center;}
/* A visible focus ring is a security feature, not decoration: it is how anyone
   navigating by keyboard knows what they are about to submit. */
.x-root :focus-visible{outline:2px solid var(--sig);outline-offset:2px;border-radius:8px;}
.x-wrap{width:100%;max-width:640px;padding:52px 22px 90px;}
.x-langbar{display:flex;justify-content:center;gap:4px;margin-bottom:16px;flex-wrap:wrap;}
.x-langbtn{background:none;border:1px solid var(--line);color:var(--mute);border-radius:7px;padding:4px 9px;font-family:ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.05em;cursor:pointer;transition:border-color .15s,color .15s,background .15s;}
.x-langbtn:hover{color:var(--ink);border-color:var(--sig);}
.x-langbtn.on{background:var(--sig);color:#04201A;border-color:var(--sig);}
.x-brand{font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--sig);text-align:center;}
.x-title{font-size:34px;font-weight:680;letter-spacing:-.025em;text-align:center;margin:14px 0 10px;line-height:1.15;}
.x-lede{color:#93A0B6;font-size:14.5px;line-height:1.6;text-align:center;max-width:48ch;margin:0 auto;}
/* Cards get depth instead of a flat outline: a top highlight, a soft shadow,
   and a slightly lighter surface than the page. */
.x-card{background:var(--card);background-image:var(--lift);border:1px solid var(--line);border-radius:16px;padding:24px;margin-top:22px;box-shadow:var(--shadow);}
.x-label{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:10px;display:block;}
.x-input{width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:15px 16px;color:var(--ink);font-size:15px;font-family:ui-monospace,monospace;outline:none;transition:border-color .15s;}
.x-input:focus{border-color:var(--sig);}
.x-kind{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:9px;min-height:15px;letter-spacing:.03em;}
.x-kind b{color:var(--sig);}
.x-btn{width:100%;margin-top:16px;background:var(--sig);color:#04201A;border:none;border-radius:11px;padding:15px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.03em;font-family:ui-monospace,monospace;text-transform:uppercase;transition:transform .1s,opacity .15s;}
.x-btn:hover:not(:disabled){transform:translateY(-1px);}
.x-btn:disabled{opacity:.4;cursor:not-allowed;}
.x-consent{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--mute);cursor:pointer;margin-top:18px;}
.x-consent input{margin-top:2px;width:15px;height:15px;accent-color:var(--sig);flex-shrink:0;}
.x-consent b{color:var(--ink);font-weight:600;}
.x-err{color:var(--coral);font-size:12.5px;margin-top:12px;font-family:ui-monospace,monospace;text-align:center;}
.x-spin{display:inline-block;width:13px;height:13px;border:2px solid #04201A;border-top-color:transparent;border-radius:50%;animation:x-rot .7s linear infinite;vertical-align:-1px;margin-right:8px;}
@keyframes x-rot{to{transform:rotate(360deg);}}

/* ── trust layer (app/components/Trust.js, app/components/Brand.js) ────────── */
.x-header{display:flex;flex-direction:column;align-items:center;gap:11px;}
/* The mark: a lens ring around a target. Drawn, not an image file, so the page
   still loads nothing from a third party. */
.x-mark{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:var(--sig);
  background:linear-gradient(160deg,rgba(56,200,154,.16),rgba(56,200,154,.03));
  border:1px solid var(--sig-edge);box-shadow:0 0 0 4px rgba(56,200,154,.04),0 14px 30px -18px rgba(56,200,154,.7);}
.x-secureline{display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,monospace;font-size:10.5px;
  letter-spacing:.08em;text-transform:uppercase;color:var(--mute);border:1px solid var(--line);
  border-radius:999px;padding:4px 11px;margin-top:2px;}
.x-secureline b{color:var(--sig);font-weight:700;}

.x-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:20px;}
.x-tsig{display:inline-flex;gap:7px;align-items:center;padding:7px 13px;border:1px solid var(--line);border-radius:999px;background:var(--card);background-image:var(--lift);cursor:default;}
.x-tico{color:var(--sig);flex-shrink:0;display:grid;place-items:center;width:18px;height:18px;
  border-radius:9px;background:var(--sig-dim);border:1px solid var(--sig-edge);}
.x-tsigt{font-size:12px;font-weight:620;letter-spacing:-.005em;white-space:nowrap;}


/* The guarantee sits beside the field itself, at the moment of the decision. */
.x-safety{display:flex;gap:10px;align-items:flex-start;margin-top:15px;padding:11px 13px;border-radius:11px;
  background:var(--sig-dim);border:1px solid var(--sig-edge);font-size:12px;line-height:1.55;color:#C6D3E6;}

.x-more{margin-top:20px;border:1px solid var(--line);border-radius:14px;background:var(--card);
  background-image:var(--lift);overflow:hidden;}
.x-moresum{list-style:none;cursor:pointer;padding:14px 18px;font-size:12.5px;font-weight:620;
  display:flex;align-items:center;justify-content:center;gap:8px;color:var(--mute);}
.x-moresum::-webkit-details-marker{display:none;}
.x-moresum:hover{color:var(--ink);}
.x-morearrow{font-size:10px;transition:transform .18s;}
.x-more[open] .x-morearrow{transform:rotate(180deg);}
.x-more[open] .x-moresum{border-bottom:1px solid var(--line);color:var(--ink);}
.x-more .x-steps{padding:18px 18px 4px;}
.x-more .x-nevert{margin-top:18px;}
.x-more .x-neverl{padding:0 18px 18px;}
.x-more .x-disclaimer{padding:0 18px 18px;margin-top:0;}
.x-howt,.x-nevert{font-size:13px;font-weight:650;margin:0 0 12px;text-align:center;letter-spacing:.01em;}
.x-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.x-step{padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--bg);}
.x-stepn{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--sig);letter-spacing:.12em;}
.x-stept{font-size:12.5px;font-weight:650;margin:7px 0 4px;}
.x-stepd{font-size:11.5px;color:var(--mute);line-height:1.5;}


.x-neverl{list-style:none;margin:0;padding:0;display:grid;gap:9px;}
.x-neverl li{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--mute);line-height:1.5;}
.x-neverx{color:var(--coral);font-weight:700;flex-shrink:0;font-size:11px;line-height:1.55;}

.x-mx{margin-top:4px;}
.x-mxscroll{overflow-x:auto;padding-bottom:4px;}
.x-mxgrid{display:grid;gap:3px;min-width:min-content;align-items:center;justify-content:start;}
.x-mxcorner{font-size:10.5px;color:var(--mute);font-family:ui-monospace,monospace;
  align-self:end;padding-bottom:7px;letter-spacing:.02em;}
.x-mxcount{color:var(--ink);font-weight:650;}
.x-mxhead{height:96px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:7px;}
.x-mxhead span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10.5px;font-weight:600;
  white-space:nowrap;letter-spacing:.01em;opacity:.82;transition:opacity .12s;}
.x-mxhead.hot span{opacity:1;}
.x-mxrow{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 0;min-height:26px;}
.x-mxlabel{font-size:11.5px;color:var(--mute);line-height:1.3;transition:color .12s;}
.x-mxrow.hot .x-mxlabel{color:var(--ink);}
.x-mxn{margin-left:auto;font-family:ui-monospace,monospace;font-size:10px;color:var(--mute);
  border:1px solid var(--line);border-radius:5px;padding:1px 5px;flex-shrink:0;}
.x-mxcell{height:26px;border-radius:6px;background:var(--bg);border:1px solid var(--line);
  display:grid;place-items:center;transition:background .12s,border-color .12s;}
.x-mxcell.lit{border-color:#2A3650;}
.x-mxdot{width:11px;height:11px;border-radius:50%;display:block;}
.x-mxcell.on{border-color:transparent;}
.x-mxfoot{margin-top:12px;font-size:11px;color:var(--mute);line-height:1.55;}
/* ---- Learn: the story strip ---- */
.x-story{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:12px;
  grid-template-columns:repeat(4,1fr);counter-reset:none;}
.x-storyp{position:relative;padding:16px 14px 15px;border:1px solid var(--line);border-radius:14px;
  background:var(--bg);display:flex;flex-direction:column;}
.x-storyp:not(:last-child)::after{content:"";position:absolute;right:-8px;top:50%;width:6px;height:6px;
  border-top:1.6px solid var(--line);border-right:1.6px solid var(--line);
  transform:translateY(-50%) rotate(45deg);}
.x-storyn{font-family:ui-monospace,monospace;font-size:10px;color:var(--mute);letter-spacing:.14em;}
.x-storyart{margin:10px 0 12px;display:grid;place-items:center;min-height:62px;}
.x-scene{display:block;max-width:118px;}
.x-storyh{font-size:13px;font-weight:650;line-height:1.3;margin-bottom:6px;letter-spacing:-.01em;}
.x-storyb{font-size:11.5px;color:var(--mute);line-height:1.55;}

/* ---- Learn: one lesson ---- */
.x-lessons-wrap{display:grid;gap:10px;margin-top:16px;}
.x-lesson{display:grid;grid-template-columns:104px 1fr;gap:16px;align-items:start;
  padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:var(--bg);}
.x-lessonart{display:grid;place-items:center;padding-top:2px;}
.x-lessonart .x-scene{max-width:100px;}
.x-lessonh{font-size:14.5px;font-weight:660;letter-spacing:-.012em;line-height:1.3;}
.x-lessons{font-size:12.5px;color:var(--mute);line-height:1.6;margin-top:5px;}
.x-lessonmore{margin-top:9px;}
.x-lessonmore summary{list-style:none;cursor:pointer;font-size:11px;color:var(--mute);
  font-family:ui-monospace,monospace;letter-spacing:.02em;display:inline-flex;gap:6px;align-items:center;}
.x-lessonmore summary::-webkit-details-marker{display:none;}
.x-lessonmore summary::before{content:"+";font-size:12px;opacity:.7;}
.x-lessonmore[open] summary::before{content:"−";}
.x-lessonmore summary:hover{color:var(--ink);}
.x-lessonp{font-size:12px;color:var(--mute);line-height:1.6;margin-top:7px;
  padding-left:11px;border-left:2px solid var(--line);}

.x-seals{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:24px;}
.x-seal{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border:1px solid var(--line);
  border-radius:999px;font-size:11px;color:var(--mute);text-decoration:none;transition:border-color .15s,color .15s;}
.x-seal:hover{border-color:var(--sig);color:var(--sig);}
.x-sealflat{cursor:default;}
.x-sealflat:hover{border-color:var(--line);color:var(--mute);}
.x-disclaimer{margin-top:16px;text-align:center;font-size:11.5px;line-height:1.6;color:var(--mute);max-width:52ch;margin-left:auto;margin-right:auto;}

/* One column on phones: three-across turns into unreadable slivers. */
@media (max-width:640px){
  .x-trust,.x-steps{grid-template-columns:1fr;}
  .x-story{grid-template-columns:1fr 1fr;}
  .x-storyp:not(:last-child)::after{display:none;}
  .x-lesson{grid-template-columns:1fr;gap:10px;}
  .x-lessonart{justify-items:start;}
  .x-title{font-size:27px;}
  .x-lede{font-size:13.5px;}
}

/* report */
.x-hero{text-align:center;padding:8px 0 4px;}
.x-gauge{position:relative;width:150px;height:150px;margin:0 auto 14px;}
.x-gnum{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.x-gval{font-family:ui-monospace,monospace;font-size:42px;font-weight:700;line-height:1;}
.x-gof{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:3px;}
.x-band{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;}
.x-hhead{font-size:19px;font-weight:650;margin:6px 0 6px;letter-spacing:-.01em;}
.x-hsub{color:var(--mute);font-size:13px;line-height:1.55;max-width:46ch;margin:0 auto;}
.x-sec{margin-top:20px;}
.x-sech{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.x-secn{font-family:ui-monospace,monospace;font-size:11px;color:var(--sig);letter-spacing:.12em;}
.x-sect{font-size:15px;font-weight:650;letter-spacing:-.01em;}
.x-secd{color:var(--mute);font-size:12.5px;line-height:1.5;margin:-6px 0 14px;}
.x-bar{display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;}
.x-bar .bl{width:118px;flex-shrink:0;color:var(--mute);font-family:ui-monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
.x-bar .bt{flex:1;height:9px;background:var(--bg);border-radius:6px;overflow:hidden;}
.x-bar .bf{height:100%;border-radius:6px;}
.x-bar .bv{width:20px;text-align:right;font-family:ui-monospace,monospace;color:var(--ink);}
.x-mosaic{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;}
.x-chip{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);font-size:12.5px;font-family:ui-monospace,monospace;}
.x-chip.on{border-color:var(--coral);background:rgba(229,106,90,.09);color:var(--ink);}
.x-chip.off{color:var(--mute);opacity:.5;}
.x-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.x-remcard{border:1px solid var(--line);border-radius:12px;padding:15px 16px;margin-top:10px;background:var(--card2);}
.x-remtop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;}
.x-remcat{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sig);}
.x-remred{font-family:ui-monospace,monospace;font-size:11px;color:var(--sig);white-space:nowrap;}
.x-remfind{font-size:13px;line-height:1.5;margin-bottom:8px;}
.x-remsteps{margin:0;padding-left:18px;color:var(--mute);font-size:12.5px;line-height:1.6;}
.x-info{border-left:2px solid var(--line);padding:2px 0 2px 14px;margin-top:12px;}
.x-infot{font-size:13px;font-weight:650;margin-bottom:3px;}
.x-infob{color:var(--mute);font-size:12.5px;line-height:1.55;}
.x-actions{display:flex;gap:10px;margin-top:22px;}
.x-again,.x-print{flex:1;background:none;border:1px solid var(--line);color:var(--mute);border-radius:10px;padding:12px;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:border-color .15s,color .15s;}
.x-again:hover,.x-print:hover{border-color:var(--sig);color:var(--sig);}
.x-tag{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;letter-spacing:.03em;}
.x-src{margin-top:12px;text-align:center;font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);letter-spacing:.04em;}
.x-foot{margin-top:26px;color:var(--mute);font-size:10.5px;line-height:1.6;text-align:center;font-family:ui-monospace,monospace;}
.x-explain{border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.6;margin-bottom:16px;background:rgba(255,255,255,.02);border:1px solid var(--line);}
.x-lglabel{font-size:12px;color:var(--mute);margin-bottom:8px;line-height:1.5;}
.x-legend{margin-bottom:16px;}
.x-lgrow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:12.5px;}
.x-lgrow:last-child{border-bottom:none;}
.x-lgrow .ll{display:flex;align-items:center;gap:8px;color:var(--mute);}
.x-lgrow .lw{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);white-space:nowrap;}
.x-lgrow.on .ll{color:var(--ink);font-weight:600;}
.x-lgrow.on .lw{color:var(--sig);}
.ldot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.x-btable{border-top:1px solid var(--line);}
.x-btrow{display:grid;grid-template-columns:1.7fr .6fr 1fr 1.1fr;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:12px;}
.x-btrow .c{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.x-bthead{color:var(--mute);font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;}
.x-btrow .contrib{display:flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:11px;justify-content:flex-end;}
.x-btrow .cbar{height:6px;border-radius:4px;flex:0 0 auto;}
.x-btfoot{display:flex;justify-content:space-between;padding:9px 2px;font-size:12.5px;border-bottom:1px solid var(--line);font-family:ui-monospace,monospace;color:var(--mute);}
.x-btfoot:last-child{border-bottom:none;font-weight:700;color:var(--ink);}
.x-fpfound{border:1px dashed var(--line);border-radius:12px;padding:14px 15px;margin-bottom:14px;background:rgba(103,116,139,.05);}
.x-fpfoundh{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-bottom:6px;}
.x-fpfoundb{color:var(--mute);font-size:12.5px;line-height:1.55;}
.x-fplink{display:inline-block;margin-top:8px;font-family:ui-monospace,monospace;font-size:12px;color:var(--sig);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 11px;transition:border-color .15s;}
.x-fplink:hover{border-color:var(--sig);}
.x-chat{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;padding:4px 2px;margin-bottom:12px;}
.x-msg{padding:10px 13px;border-radius:13px;font-size:13px;line-height:1.55;max-width:88%;white-space:pre-wrap;}
.x-msg.bot{background:var(--card2);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px;}
.x-msg.me{background:var(--sig);color:#04201A;align-self:flex-end;border-bottom-right-radius:4px;font-weight:500;}
.x-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px;}
.x-chip2{background:none;border:1px solid var(--line);color:var(--mute);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;transition:border-color .15s,color .15s;font-family:inherit;}
.x-chip2:hover:not(:disabled){border-color:var(--sig);color:var(--sig);}
.x-chip2:disabled{opacity:.5;cursor:not-allowed;}
.x-chatin{display:flex;gap:8px;}
.x-send{background:var(--sig);color:#04201A;border:none;border-radius:10px;padding:0 18px;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
.x-send:disabled{opacity:.4;cursor:not-allowed;}
.x-spin2{display:inline-block;width:11px;height:11px;border:2px solid var(--mute);border-top-color:transparent;border-radius:50%;animation:x-rot .7s linear infinite;margin-right:7px;vertical-align:-1px;}
.x-flow{display:flex;align-items:flex-start;justify-content:space-between;gap:2px;margin:6px 0 18px;}
.x-fnode{display:flex;flex-direction:column;align-items:center;gap:9px;flex:1;text-align:center;min-width:0;}
.x-ficon{width:50px;height:50px;border-radius:13px;border:1.5px solid var(--sig);display:flex;align-items:center;justify-content:center;background:var(--card2);flex-shrink:0;}
.x-flabel{font-size:10.5px;color:var(--mute);line-height:1.35;max-width:82px;}
.x-farrow{display:flex;align-items:center;justify-content:center;font-size:18px;height:50px;flex-shrink:0;opacity:.65;}
.x-nudge{position:fixed;right:22px;bottom:96px;width:256px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 14px 13px;box-shadow:0 14px 44px rgba(0,0,0,.55);z-index:61;animation:x-nudgein .45s cubic-bezier(.2,1.2,.4,1);}
.x-nudge::after{content:"";position:absolute;right:24px;bottom:-7px;width:13px;height:13px;background:var(--card);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg);}
@keyframes x-nudgein{from{opacity:0;transform:translateY(12px) scale(.95);}to{opacity:1;transform:none;}}
.x-nudgex{position:absolute;top:7px;right:10px;background:none;border:none;color:var(--mute);font-size:17px;cursor:pointer;line-height:1;}
.x-nudgex:hover{color:var(--ink);}
.x-nudgemsg{font-size:13px;line-height:1.5;color:var(--ink);margin-bottom:11px;padding-right:14px;}
.x-nudgecta{background:var(--sig);color:#04201A;border:none;border-radius:8px;padding:8px 13px;font-family:ui-monospace,monospace;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;}
.x-nudgecta:hover{transform:translateY(-1px);}
.x-tabs{display:flex;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:5px;margin-top:22px;position:sticky;top:12px;z-index:20;}
.x-tab{flex:1;background:none;border:none;color:var(--mute);border-radius:8px;padding:10px 8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s,color .15s;letter-spacing:.01em;}
.x-tab:hover{color:var(--ink);}
.x-tab.on{background:var(--sig);color:#04201A;}
.x-panelfade{animation:x-fade .28s ease;}
@keyframes x-fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.x-glance{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:14px;}
.x-gchip{font-family:ui-monospace,monospace;font-size:11px;text-transform:capitalize;color:var(--mute);border:1px solid var(--line);border-radius:999px;padding:4px 11px;letter-spacing:.02em;}
.x-launcher{position:fixed;right:22px;bottom:22px;width:60px;height:60px;border-radius:50%;background:var(--sig);border:none;cursor:pointer;box-shadow:0 8px 28px rgba(56,200,154,.35),0 6px 20px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;transition:transform .15s;animation:x-pop .5s cubic-bezier(.2,1.3,.4,1);}
.x-launcher:hover{transform:translateY(-2px) scale(1.05);}
.x-launcher::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--sig);animation:x-pulse 2.6s ease-out infinite;pointer-events:none;}
@keyframes x-pop{0%{transform:scale(0) rotate(-12deg);}70%{transform:scale(1.14);}100%{transform:scale(1);}}
@keyframes x-pulse{0%{transform:scale(1);opacity:.55;}70%{transform:scale(1.55);opacity:0;}100%{opacity:0;}}
.x-tip{position:absolute;right:74px;top:50%;background:var(--card);border:1px solid var(--line);color:var(--ink);font-size:12.5px;font-weight:500;padding:9px 13px;border-radius:11px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.45);animation:x-tipfade 7s ease forwards;}
.x-tip::after{content:"";position:absolute;right:-6px;top:50%;transform:translateY(-50%) rotate(45deg);width:10px;height:10px;background:var(--card);border-right:1px solid var(--line);border-top:1px solid var(--line);}
@keyframes x-tipfade{0%{opacity:0;transform:translateY(-50%) translateX(8px);}9%{opacity:1;transform:translateY(-50%) translateX(0);}82%{opacity:1;transform:translateY(-50%) translateX(0);}100%{opacity:0;transform:translateY(-50%) translateX(8px);visibility:hidden;pointer-events:none;}}
.x-panel{position:fixed;right:22px;bottom:22px;width:380px;max-width:calc(100vw - 32px);height:564px;max-height:calc(100vh - 44px);background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 16px 54px rgba(0,0,0,.55);display:flex;flex-direction:column;z-index:60;overflow:hidden;}
.x-panelhead{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);flex-shrink:0;}
.x-paneltitle{font-weight:650;font-size:15px;display:flex;align-items:center;gap:8px;}
.x-ai{font-family:ui-monospace,monospace;font-size:10px;color:var(--sig);border:1px solid var(--line);border-radius:5px;padding:2px 6px;letter-spacing:.1em;}
.x-panelx{background:none;border:none;color:var(--mute);font-size:24px;cursor:pointer;line-height:1;padding:0 4px;}
.x-panelx:hover{color:var(--ink);}
.x-chatpanel{flex:1;max-height:none;margin-bottom:0;padding:14px 16px;}
.x-panelfoot{padding:12px 16px;border-top:1px solid var(--line);flex-shrink:0;}
.x-panelfoot .x-chips{margin-bottom:9px;}

/* ---- added for the MVP: mode tabs, verification, residual risk, letters ---- */
.x-modes{display:flex;gap:6px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:4px;margin-bottom:18px;}
.x-mode{flex:1;background:none;border:none;color:var(--mute);border-radius:9px;padding:9px 6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
.x-mode.on{background:var(--sig);color:#04201A;}
.x-mode:disabled{cursor:not-allowed;opacity:.55;}
.x-soon{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--line);border-radius:5px;padding:1px 4px;margin-left:5px;vertical-align:1px;}
.x-dev{margin-top:12px;border:1px dashed var(--amber);color:var(--amber);border-radius:10px;padding:8px 12px;font-family:ui-monospace,monospace;font-size:12px;text-align:center;}
.x-hint{color:var(--mute);font-size:13px;line-height:1.5;margin-bottom:12px;}
.x-hint b{color:var(--ink);}
.x-codeinput{letter-spacing:.5em;text-align:center;font-size:22px;}
.x-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap;}
.x-linkbtn{background:none;border:none;color:var(--sig);font-family:ui-monospace,monospace;font-size:12px;cursor:pointer;padding:4px 0;}
.x-linkbtn:disabled{color:var(--mute);cursor:not-allowed;}
.x-privlink{color:var(--sig);text-decoration:none;white-space:nowrap;}
.x-privlink:hover{text-decoration:underline;}
.x-scorenote{color:var(--mute);font-size:11.5px;line-height:1.5;margin:10px auto 0;max-width:44ch;}
.x-duo{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;}
.x-duocell{border:1px solid var(--line);border-radius:12px;padding:12px;text-align:center;background:var(--card2);}
.x-duolabel{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);}
.x-duonum{font-family:ui-monospace,monospace;font-size:28px;font-weight:700;margin-top:4px;}
.x-done{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12.5px;color:var(--ink);cursor:pointer;}
.x-done input{width:15px;height:15px;accent-color:var(--sig);}
.x-remcard.isdone{border-color:rgba(56,200,154,.45);}
.x-remcard.isdone .x-remfind,.x-remcard.isdone .x-remsteps{opacity:.6;}
.x-letters{margin-top:12px;border-top:1px dashed var(--line);padding-top:10px;}
.x-letterrow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;font-size:12.5px;}
.x-letterrow .n{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.x-mini{background:none;border:1px solid var(--line);color:var(--mute);border-radius:7px;padding:4px 9px;font-family:ui-monospace,monospace;font-size:11px;cursor:pointer;white-space:nowrap;}
.x-mini:hover,.x-mini.on{border-color:var(--sig);color:var(--sig);}
.x-letter{width:100%;box-sizing:border-box;min-height:230px;margin-top:8px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:12px;font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.55;resize:vertical;}
.x-botacts{margin-top:8px;border-top:1px solid var(--line);padding-top:8px;}
.x-botact{margin-top:6px;}
.x-botact b{font-size:12.5px;}
.x-botact ol{margin:4px 0 0;padding-left:18px;color:var(--mute);font-size:12px;line-height:1.5;}
.x-botletterrow{display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;}
/* The agent's working: which tools produced the figures in the answer above. */
.x-bottrace{margin-top:8px;color:var(--mute);font-size:10.5px;letter-spacing:.02em;opacity:.8;}
/* ── exposure map + breach cards (app/components/BreachMap.js) ───────────── */
.x-mapwrap{margin-top:4px;}
.x-map{width:100%;height:auto;display:block;}
.x-maplegend{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;
  margin-top:6px;font-size:11px;color:var(--mute);}
.x-mapkeys{display:flex;flex-wrap:wrap;gap:12px;}
.x-mapkey{display:inline-flex;align-items:center;gap:5px;}
.x-mapdot{width:9px;height:9px;border-radius:50%;display:inline-block;}

/* The score divided in proportion. One segment usually fills most of the bar,
   which is the point: exposure concentrates in a single breach. */
.x-ribbonwrap{margin-top:16px;}
.x-ribbon{display:flex;height:16px;border-radius:6px;overflow:hidden;background:var(--bg);
  border:1px solid var(--line);}
.x-ribbonseg{cursor:pointer;transition:filter .15s,opacity .15s;opacity:.78;min-width:4px;
  border-right:1px solid rgba(8,11,18,.55);}
.x-ribbonseg:last-child{border-right:none;}
.x-ribbonseg:hover{opacity:1;}
.x-ribbonseg.on{opacity:1;filter:brightness(1.25);}
.x-ribbonnote{margin-top:7px;font-size:12.5px;color:var(--mute);line-height:1.5;}
.x-ribbonnote b{color:var(--ink);font-weight:650;}

.x-breaches{display:grid;gap:9px;margin-top:16px;}
/* The left border carries the severity tier colour, so the card and its bubble
   on the map are recognisably the same record. */
.x-breach{border:1px solid var(--line);border-left-width:3px;border-radius:11px;padding:12px 14px;
  background:var(--card2);cursor:pointer;transition:border-color .15s,background .15s;}
.x-breach:hover{background:#17202F;}
.x-breach.on{background:#17202F;box-shadow:0 0 0 1px var(--sig-edge);}
.x-breachtop{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;}
.x-breachname{font-size:14px;font-weight:650;letter-spacing:-.01em;}
.x-breachdate{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--mute);white-space:nowrap;}
.x-breachtier{font-family:ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.07em;
  text-transform:uppercase;margin-top:5px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;}
.x-breachsrc{color:var(--mute);font-weight:400;letter-spacing:.03em;text-transform:none;}
.x-classes{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;}
.x-class{font-size:11.5px;color:#C3CDDC;background:rgba(255,255,255,.04);border:1px solid var(--line);
  border-radius:999px;padding:3px 9px;}
.x-contrib{display:flex;align-items:center;gap:9px;margin-top:10px;}
.x-contribbar{flex:1;height:5px;background:var(--bg);border-radius:4px;overflow:hidden;}
.x-contribbar span{display:block;height:100%;border-radius:4px;}
.x-contribval{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);min-width:40px;text-align:right;}

@media (max-width:640px){
  .x-breachdate{white-space:normal;}
  .x-maplegend{flex-direction:column;align-items:flex-start;}
}

.x-assumed{color:var(--amber);}
/* Small screens: keep the ExpoBot bubble on the bottom edge so it doesn't cover the tabs or content mid-page. */
@media (max-width:560px){.x-nudge{left:14px;right:14px;width:auto;bottom:90px;}.x-nudge::after{right:34px;}.x-panel{right:8px;bottom:8px;}}
@media print{.x-actions,.x-foot,.x-consent,.x-langbar,.x-tabs,.x-launcher,.x-panel,.x-nudge{display:none!important;}.x-root{background:#fff;color:#000;}}
`;
