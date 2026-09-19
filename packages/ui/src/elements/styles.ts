let injected = false;

/** 注入元素样式（只注入一次，全局共享，便于用户覆写）。 */
export function injectElementStyles(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const css = document.createElement('style');
  css.id = 'mkt-elements-styles';
  css.textContent = `
mkt-map{display:block;position:relative;min-height:240px;height:100%}
mkt-map .mkt-map-canvas{position:absolute;inset:0;width:100%;height:100%}

/* map settings control */
.mkt-map-settings{position:relative}
.mkt-map-settings-btn{display:grid;place-items:center;width:30px;height:30px;padding:0;border:none;cursor:pointer;color:#d4d4d8;background:rgba(16,16,28,.82);backdrop-filter:blur(10px);transition:background .15s,color .15s}
.mkt-map-settings-btn:hover,.mkt-map-settings-btn.on{color:#fff;background:rgba(74,158,255,.28)}
.mkt-map-settings-menu{position:absolute;left:calc(100% + 8px);top:0;min-width:190px;background:linear-gradient(180deg,rgba(18,18,30,.98),rgba(12,12,21,.99));border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px 12px;box-shadow:0 18px 46px rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
.mkt-map-settings-menu[hidden]{display:none}
.mkt-map-settings-row{display:flex;align-items:center;gap:8px;font-size:12px;color:#b9b9cc}
.mkt-map-settings-row+.mkt-map-settings-row{margin-top:8px}
.mkt-map-settings-row select{flex:1;min-width:0;height:32px;padding:0 8px;border-radius:8px;background:rgba(255,255,255,.05);color:#e6e6f0;border:1px solid rgba(255,255,255,.1);outline:none;font-size:12px;color-scheme:dark}
.mkt-map-settings-row select option{background:#12121e}

/* scale */
mkt-scale{display:inline-block;font-size:11px;color:#cdcdda;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
mkt-scale .mkt-scale-inner{display:flex;flex-direction:column;gap:2px}
mkt-scale .mkt-scale-bar{height:7px;border:2px solid #d4d4d8;border-top:none;box-sizing:border-box}
mkt-scale .mkt-scale-label{white-space:nowrap;color:#d4d4d8}

/* output */
mkt-output{display:block;white-space:pre-wrap;word-break:break-all;font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:12px;color:#b9b9cc}

/* search */
mkt-search{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
mkt-search .mkt-search{display:flex;gap:8px}
mkt-search .mkt-search-input{flex:1;min-width:0;height:36px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e6e6f0;font-size:13px;outline:none}
mkt-search .mkt-search-input:focus{border-color:rgba(74,158,255,.6);background:rgba(74,158,255,.06)}
mkt-search .mkt-search-btn{flex-shrink:0;height:36px;padding:0 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#fff;background:linear-gradient(120deg,#6c5ce7,#4a9eff)}
mkt-search .mkt-search-btn:hover{filter:brightness(1.12)}
mkt-search .mkt-search-results{margin-top:8px;border-radius:12px;background:rgba(16,16,28,.96);border:1px solid rgba(255,255,255,.09);overflow:auto;max-height:40vh}
mkt-search .mkt-search-results[hidden]{display:none}
mkt-search .mkt-search-item{display:flex;flex-direction:column;gap:2px;padding:9px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)}
mkt-search .mkt-search-item:last-child{border-bottom:none}
mkt-search .mkt-search-item:hover{background:rgba(74,158,255,.14)}
mkt-search .mkt-search-name{font-size:13px;color:#e2e2ea}
mkt-search .mkt-search-meta{font-size:11px;color:#6a6a80;font-family:"SF Mono",ui-monospace,Menlo,monospace}

/* coord panel */
mkt-coord-panel{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
mkt-coord-panel .mkt-cp{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px;background:rgba(255,255,255,.02)}
mkt-coord-panel .mkt-cp-tabs{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:5px;margin-bottom:10px}
mkt-coord-panel .mkt-cp-tab{font-size:12px;color:#7a7a90;padding:5px 4px;text-align:center;border-radius:8px;border:1px solid transparent;cursor:pointer;user-select:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
mkt-coord-panel .mkt-cp-tab:hover{color:#e2e2ea;background:rgba(255,255,255,.06)}
mkt-coord-panel .mkt-cp-tab.on{color:#8fc0ff;background:rgba(74,158,255,.16);border-color:rgba(74,158,255,.35);font-weight:600}
mkt-coord-panel .mkt-cp-hero{padding:10px 12px;border-radius:12px;background:linear-gradient(120deg,rgba(108,92,231,.2),rgba(74,158,255,.1) 70%,transparent);border:1px solid rgba(139,123,255,.3);font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;color:#ececff;word-break:break-all;margin-bottom:8px}
mkt-coord-panel .mkt-cp-row{display:flex;gap:8px;padding:4px 0;font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:12.5px}
mkt-coord-panel .mkt-cp-tag{flex-shrink:0;min-width:64px;color:#6a6a80}
mkt-coord-panel .mkt-cp-val{color:#e2e2ea;word-break:break-all}

/* legend */
mkt-legend{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
mkt-legend .mkt-legend-inner{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.02)}
mkt-legend .mkt-legend-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6a6a80;margin-bottom:6px}
mkt-legend .mkt-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#cdcdda;line-height:1.9}
mkt-legend .mkt-legend-sw{flex-shrink:0;width:14px;height:10px;border-radius:3px;background:var(--c,rgba(74,158,255,.25));border:2px solid var(--c,#4a9eff);box-sizing:border-box}
mkt-legend .mkt-legend-sw-line{height:3px;width:16px;border:none;border-radius:2px;background:var(--c,#4a9eff)}
mkt-legend .mkt-legend-sw-point{width:12px;height:12px;border-radius:50%;background:radial-gradient(circle,var(--c,#4a9eff) 0 3px,transparent 4px);border:2px solid var(--c,#4a9eff)}
mkt-legend .mkt-legend-sw-box{border:1.5px dashed var(--c,#6c5ce7);background:color-mix(in srgb,var(--c,#6c5ce7) 12%,transparent)}
mkt-legend .mkt-legend-sw-base{background:linear-gradient(90deg,#6c5ce7,#4a9eff);border:none}

/* info */
mkt-info{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
mkt-info[hidden]{display:none}
mkt-info .mkt-info-inner{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.02)}
mkt-info .mkt-info-name{font-size:13px;font-weight:700;color:#ececff;margin-bottom:6px;word-break:break-all}
mkt-info .mkt-info-row{display:flex;gap:8px;font-size:12px;line-height:1.9;font-family:"SF Mono",ui-monospace,Menlo,monospace}
mkt-info .mkt-info-k{flex-shrink:0;min-width:56px;color:#6a6a80}
mkt-info .mkt-info-v{color:#e2e2ea;word-break:break-all}

/* settings */
mkt-settings{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif}
mkt-settings .mkt-settings{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.02)}
mkt-settings .mkt-settings-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6a6a80;margin-bottom:6px}
mkt-settings .mkt-settings-row{display:flex;align-items:center;gap:8px;font-size:12px;color:#b9b9cc}
mkt-settings .mkt-settings-row select{flex:1;min-width:0;height:32px;padding:0 8px;border-radius:8px;background:rgba(255,255,255,.05);color:#e6e6f0;border:1px solid rgba(255,255,255,.1);outline:none;font-size:12px;color-scheme:dark}
mkt-settings .mkt-settings-row select option{background:#12121e}
`;
  document.head.appendChild(css);
}
