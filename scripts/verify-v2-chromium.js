#!/usr/bin/env node
'use strict';
// Optional final real-browser gate. Uses Chromium's local DevTools protocol and
// Node's built-in WebSocket; no browser library or game server is required.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { INVENTORY, engineFingerprint, digest } = require('./report-par-routes');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'docs/level-design/v2-chromium-verification.json');
function presentationFingerprint(root = ROOT) {
  return digest(['index.html', 'glyphs.html', 'src/css/sm.css', 'src/js/sm-ui.js', 'src/js/sm-io.js',
    'src/js/sm-render.js', 'src/js/sm-glyphs.js', 'editor.html', 'src/js/sm-editor.js', 'src/css/sm-editor.css',
    'src/js/sm-visuals.js', 'src/js/sm-sprites.js', 'src/js/sm-draw.js', 'src/js/sm-surface.js',
    'src/css/sm-graphics.css', 'src/vendor/konva/konva.min.js', 'src/vendor/konva/provenance.json']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')));
}

async function main() {
  if (typeof WebSocket !== 'function') throw new Error('This optional check needs Node with built-in WebSocket.');
  const directory = fs.mkdtempSync('/tmp/opencode/v2-chromium-');
  const browser = spawn(process.env.CHROMIUM || '/usr/bin/chromium', ['--headless', '--no-sandbox', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--remote-debugging-port=0', '--user-data-dir=' + path.join(directory, 'profile'), 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  const pending = new Map(), external = [], errors = [];
  let socket, serial = 0, stderr = '', identity = 'pixel';
  const report = { generatedBy: 'verify-v2-chromium', generatedAt: new Date().toISOString(),
    transport: 'Actual headless Chromium / local DevTools / file:// (not jsdom)',
    engineFingerprint: engineFingerprint(), presentationFingerprint: presentationFingerprint(),
    packs: [], gallery: null, identities: {}, referenceCPU: os.cpus()[0].model, screenshotsDirectory: directory, passed: false };
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chromium launch timed out: ' + stderr.slice(-2000))), 15000);
      browser.once('error', reject);
      browser.once('exit', code => { clearTimeout(timeout); reject(new Error('Chromium exited during launch: ' + code + '\n' + stderr.slice(-2000))); });
      browser.stderr.on('data', chunk => {
        stderr += chunk;
        const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderr);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const operation = pending.get(message.id); if (!operation) return;
        pending.delete(message.id); clearTimeout(operation.timeout);
        if (message.error) operation.reject(new Error(JSON.stringify(message.error))); else operation.resolve(message.result);
      } else if (message.method === 'Network.requestWillBeSent') {
        const url = message.params.request.url;
        if (!/^(?:file:|data:|blob:|about:)/.test(url)) external.push(url);
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    });
    function call(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const id = ++serial, timeout = setTimeout(() => { pending.delete(id); reject(new Error('DevTools timeout: ' + method)); }, 30000);
        pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    }
    const version = await call('Browser.getVersion'); report.browser = version;
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => call(method, params, sessionId);
    await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable'].map(method => send(method)));
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function wait(expression) {
      const deadline = Date.now() + 15000;
      while (!await evaluate(expression)) {
        if (Date.now() > deadline) throw new Error('Page condition timed out: ' + expression);
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); true`); }
    async function key(key) {
      await evaluate('document.activeElement && document.activeElement.blur(); true');
      const number = { ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ArrowLeft: 37, ' ': 32, z: 90, r: 82 }[key];
      const code = key === ' ' ? 'Space' : key.length === 1 ? 'Key' + key.toUpperCase() : key;
      for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: number, nativeVirtualKeyCode: number });
      await wait('!SM.game.pending');
    }
    const actionKey = action => action.type === 'act' ? ' ' : { north: 'ArrowUp', east: 'ArrowRight', south: 'ArrowDown', west: 'ArrowLeft' }[action.dir];
    async function screenshot(name) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(directory, identity + '-' + name + '.png'); fs.writeFileSync(file, Buffer.from(data, 'base64')); return file;
    }
    async function paste(text, world) {
      await evaluate(`document.querySelector('#yaml').value = ${JSON.stringify(text)}; document.querySelector('#btn-apply').click(); true`);
      await wait(`SM.game.state.level.worldId === ${JSON.stringify(world)} && !SM.game.pending`);
    }
    async function select(index) {
      assert.equal(await evaluate(`document.querySelectorAll('#levels button')[${index}].disabled`), false);
      await evaluate(`document.querySelectorAll('#levels button')[${index}].click(); true`);
      await wait(`SM.game.index === ${index} && !SM.game.pending`);
    }
    async function playWithUndo(index, prefix, name) {
      await select(index);
      const route = await evaluate('SM.game.state.level.solve.path');
      for (const action of route.slice(0, prefix - 1)) await key(actionKey(action));
      const before = await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))');
      await key(actionKey(route[prefix - 1]));
      const image = await screenshot(name);
      if (name === 'world-05-carriers') {
        assert.equal(await evaluate('SM.game.r.surface.layers[2].find(".support-badge").some(n=>n.getAttr("stroke")===SM.PALETTE.blu)'), true);
      }
      if (name === 'world-03-pending') {
        assert.equal(await evaluate('SM.RULES.closureAt(SM.game.state,2,1).pendingClose'), true);
        assert.equal(await evaluate(`document.querySelector('[data-x="2"][data-y="1"]').dataset.pendingClose === 'true'`), true);
      }
      await key('z'); assert.equal(await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))'), before);
      await key(actionKey(route[prefix - 1]));
      for (const action of route.slice(prefix)) await key(actionKey(action));
      assert.equal(await evaluate('SM.game.state.won && !SM.game.state.failed && SM.game.state.strokes === SM.game.state.level.solve.optimal'), true);
      assert.equal(await evaluate('SM.RULES.snapshotSig(SM.game.r.view) === SM.RULES.snapshotSig(SM.game.state)'), true);
      return image;
    }
    for (identity of ['pixel', 'vector']) {
    const evidence = report.identities[identity] = { packs: [], gallery: null, editor: null };
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href + '?theme=' + identity });
    await wait('typeof SM !== "undefined" && SM.game && SM.game.state && !SM.game.pending');
    assert.equal(await evaluate('SM.game.r.surface.error || null'), null);
    assert.equal(await evaluate('SM.PRESENTATION.settings.theme'), identity);
    await evaluate('SM.PRESENTATION.set({motion:"full"});true');
    assert.equal(await evaluate('(() => { const c=document.querySelector("#board canvas"),p=c.getContext("2d").getImageData(0,0,c.width,c.height).data; return new Set(Array.from(p).filter((_,i)=>i%4!==3)).size > 5; })()'), true);
    const scenarios = [[0, 1, 'prologue-walking'], [0, 1, 'world-01-target'], [0, 3, 'world-02-shield'],
      [6, 5, 'world-03-pending'], [7, 1, 'world-04-bumper'], [2, 6, 'world-05-carriers'], [3, 1, 'world-06-cargo']];
    for (const [number, item] of INVENTORY.entries()) {
      const text = fs.readFileSync(path.join(ROOT, item.file), 'utf8');
      const document = await evaluate(`SM.parseYAML(${JSON.stringify(text)})`);
      const { root } = await send('DOM.getDocument');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#file' });
      await send('DOM.setFileInputFiles', { nodeId, files: [path.join(ROOT, item.file)] });
      await wait(`SM.io.sourceName === 'levels.yaml' && SM.game.levels.length === ${item.count} && SM.game.state.level.worldId === ${JSON.stringify(item.world)} && !SM.game.pending`);
      assert.deepEqual(await evaluate('SM.io.source'), document);
      assert.equal(await evaluate('SM.game.levels.every(level => level.solve.status === "solvable" && level.solve.verified && level.solve.optimal === level.par)'), true);
      await click('#btn-fill');
      const roundTrip = await evaluate('document.querySelector("#yaml").value');
      assert.deepEqual(await evaluate(`SM.parseYAML(${JSON.stringify(roundTrip)})`), document);
      await paste(roundTrip, item.world); assert.deepEqual(await evaluate('SM.io.source'), document);
      const prior = await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))');
      await evaluate('document.querySelector("#yaml").value="num_level: nope"; document.querySelector("#btn-apply").click(); true');
      assert.equal(await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))'), prior);
      const [index, prefix, label] = scenarios[number];
      const row = { world: item.world, levels: item.count, sourceFingerprint: digest(document), filePicker: true,
        pasteAndYamlRoundTrip: true, invalidLoadAtomic: true, nativeMinimaVerified: true,
        representative: 'level_' + (index + 1), nonterminalUndo: true };
      row.screenshot = await playWithUndo(index, prefix, label);
      await click('#btn-fill');
      assert.deepEqual(await evaluate('SM.parseYAML(document.querySelector("#yaml").value)'), document);
      row.authoredExportAfterPlay = true;
      if (number === 0) {
        row.carriersScreenshot = await playWithUndo(1, 2, 'prologue-carriers');
        assert.equal(await evaluate('SM.game.state.level.raw.win_picture.startsWith("data:image/png;base64,") && !document.querySelector("#win-picture-panel").hidden'), true);
        await wait('document.querySelector("#win-picture").complete && document.querySelector("#win-picture").naturalWidth === 250');
        row.customVictoryVerified = true; row.customVictoryScreenshot = await screenshot('prologue-custom-victory');
        row.conveyor = await playWithUndo(2, 2, 'prologue-conveyor');
      }
      if (number === 4) {
        const original = await evaluate('SM.GRAPHICS.thumbnail([SM.VISUALS.describe(SM.TILES[60],{W:"wht"})],SM.PRESENTATION.settings.theme,64)');
        const tinted = await evaluate('(() => { const doc=JSON.parse(JSON.stringify(SM.io.source)); Object.values(doc.levels).forEach(l => { l.overrides=l.overrides||{}; [...new Set(l.grid.flat())].forEach(id => { if(id>=60&&id<=67)l.overrides[id]=Object.assign({},l.overrides[id],{colour:"red"}); }); }); return SM.emitYAML(doc); })()');
        await paste(tinted, item.world); await select(7); await key('ArrowRight');
        assert.deepEqual(await evaluate('SM.game.state.player'), { x: 6, y: 4 });
        assert.equal(await evaluate('SM.GRAPHICS.thumbnail([SM.VISUALS.describe(Object.assign({},SM.TILES[60],{params:Object.assign({},SM.TILES[60].params,{colour:"red"})}),{W:"wht"})],SM.PRESENTATION.settings.theme,64)'), original);
        row.inertTintVariant = true;
      }
      if (number === 2 || number === 3) {
        await key('r');
        const moves = number === 2 ? ['ArrowUp', 'ArrowUp'] :
          ['ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowRight', ' ', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        for (const command of moves) await key(command);
        assert.equal(await evaluate('SM.game.state.failed && !SM.game.state.won'), true);
        assert.equal(await evaluate('SM.game.state.failureReason'), number === 2 ? 'ray' : 'closure');
        const frozen = await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))');
        await key('z'); assert.equal(await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))'), frozen);
        row.nativeTerminal = number === 2 ? 'authored shield tutorial: unshielded crossing' : 'authored polarity level: dot follows crate off pending barrier';
        row.nativeFailureScreenshot = await screenshot(number === 2 ? 'world-02-native-failure' : 'world-03-native-closure');
      }
      // The same real UI terminal fixture is reloaded from each pack context.
      // It is deliberately labeled as shared verification, not an authored route.
      const failedWorld = 'chromium-failure-' + item.world;
      const failure = `name: "Chromium terminal fixture"\nworld_id: ${failedWorld}\nnum_level: 1\nlevels:\n  level_1:\n    name: "Frozen exposure"\n    width: 3\n    height: 2\n    golf_score: 3\n    grid:\n      - [82, 0, 2]\n      - [1, 0, 0]\n`;
      await paste(failure, failedWorld); await key('ArrowRight'); await key('ArrowUp');
      assert.equal(await evaluate('SM.game.state.failed && document.querySelector("#board").dataset.outcome === "failed" && !SM.game.r.surface.clock.isRunning()'), true);
      assert.equal(await evaluate('document.querySelector("#btn-undo").disabled && document.querySelector("#btn-act").disabled && document.querySelector("#win-picture-panel").hidden'), true);
      const frozen = await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))');
      await key('z'); await key('ArrowLeft'); assert.equal(await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))'), frozen);
      assert.equal(await evaluate(`SM.STORE.entry('level_1',${JSON.stringify(failedWorld)}).best`), null);
      row.sharedTerminalFixture = true;
      if (number === 2) row.failureScreenshot = await screenshot('terminal-failure');
      await key('r'); assert.equal(await evaluate('!SM.game.state.failed && SM.game.state.strokes === 0 && !document.querySelector("#btn-act").disabled'), true);
      row.restart = true;
      await click('#btn-reset-levels');
      await wait('SM.game.state.level.worldId === "prologue" && SM.game.levels.length === 13');
      row.returnToPrologue = true; evidence.packs.push(row); if (identity === 'pixel') report.packs.push(row);
    }
    await evaluate('SM.game.restart();SM.PRESENTATION.set({motion:"full"});SM.game.act({type:"move",dir:"east"});SM.game.act({type:"move",dir:"east"});SM.game.r.cancel();true');
    assert.equal(await evaluate('SM.game.state.strokes===2 && !SM.game.pending && SM.RULES.snapshotSig(SM.game.r.view)===SM.RULES.snapshotSig(SM.game.state)'), true);
    const preferenceState = await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))');
    await evaluate('Object.defineProperty(window,"localStorage",{configurable:true,get(){throw new Error("Storage denied fixture")}});SM.PRESENTATION.set({motion:"reduced"});true');
    assert.equal(await evaluate('SM.PRESENTATION.reduced()'), true);
    assert.equal(await evaluate('JSON.stringify(SM.RULES.snapshot(SM.game.state))'), preferenceState);
    assert.equal(await evaluate('SM.game.r.surface.clock.isRunning()'), false);
    evidence.interruptedPlayback = true; evidence.deniedStorage = true; evidence.reducedMotion = true;
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'glyphs.html')).href + '?theme=' + identity });
    await wait('document.documentElement.dataset.galleryReady === "true"');
    assert.equal(await evaluate('document.querySelectorAll("[data-tile-id]").length'), 62);
    assert.equal(await evaluate('document.querySelectorAll("[data-object-id=dot]").length'), 1);
    assert.equal(await evaluate(`!!document.querySelector('[data-tile-id="0"]')`), true);
    const arrows = await evaluate('Array.from(document.querySelectorAll("[data-tile-id]")).filter(el=>Number(el.dataset.tileId)>=60&&Number(el.dataset.tileId)<=67).map(el=>({exit:el.querySelector(".preview").dataset.exit,rect:el.querySelector("img").getBoundingClientRect().width}))');
    assert.equal(arrows.length, 8); assert.equal(new Set(arrows.map(arrow => arrow.exit)).size, 4);
    assert.ok(arrows.every(arrow => arrow.rect > 0));
    const galleryArrow = await evaluate(`document.querySelector('[data-tile-id="60"] .preview img').src`);
    await evaluate('const tint=document.querySelector("#sample-tint"); tint.value="red"; tint.dispatchEvent(new Event("change")); true');
    assert.equal(await evaluate(`document.querySelector('[data-tile-id="60"] .preview img').src`), galleryArrow);
    await evaluate(`const gate=document.querySelector('[data-tile-id="10"] select'); gate.value="pending"; gate.dispatchEvent(new Event("change")); const dot=document.querySelector('[data-object-id=dot] select'); dot.value="failed"; dot.dispatchEvent(new Event("change")); true`);
    assert.equal(await evaluate(`document.querySelector('[data-tile-id="10"] .preview').dataset.pendingClose === 'true' && document.querySelector('[data-object-id=dot] .preview').dataset.outcome === "failed"`), true);
    evidence.gallery = { definitions: 63, arrows: 8, directions: 4, inertTint: true, pendingAndFailedSamples: true,
      screenshot: await screenshot('gallery-top') };
    await evaluate(`document.querySelector('[data-tile-id="60"]').scrollIntoView(); true`);
    evidence.gallery.arrowsScreenshot = await screenshot('gallery-arrows');
    if (identity === 'pixel') report.gallery = evidence.gallery;

    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'editor.html')).href + '?theme=' + identity });
    await wait('typeof SM !== "undefined" && SM.editor && document.querySelectorAll(".palette-entry").length >= 62');
    const editorPack = fs.readFileSync(path.join(ROOT, INVENTORY[1].file), 'utf8');
    await evaluate(`document.querySelector('#yaml').value=${JSON.stringify(editorPack)};document.querySelector('#btn-apply').click();true`);
    await wait('document.querySelectorAll("#grid .cell").length > 0');
    assert.equal(await evaluate('document.querySelector("#grid")._graphicsSurface.error || null'), null);
    await click('#btn-snap-a'); await click('#btn-snap-b'); await click('#btn-solve');
    assert.equal(await evaluate('SM.editor.solveAB().status'), 'solvable');
    assert.equal(await evaluate('document.querySelectorAll(".snapshot-preview canvas").length >= 2'), true);
    await click('#btn-test'); await wait('SM.editor.quickTestHasSession()');
    assert.equal(await evaluate('document.querySelector("#test-board canvas") !== null'), true);
    await click('[data-test-act="east"]');
    await evaluate('SM.editor.quickTestUndo();true');
    assert.equal(await evaluate('SM.editor.quickTestStrokes()'), 0);
    assert.deepEqual(await evaluate('SM.parseYAML(SM.editor.exportYaml())'), await evaluate(`SM.parseYAML(${JSON.stringify(editorPack)})`));
    evidence.editor = { sharedBoard: true, sharedQuickTest: true, sharedSnapshots: true, solver: true, authoredExport: true,
      screenshot: await screenshot('editor-shared') };
    evidence.editor.coordinateMatrix = [];
    for (const dpr of [1, 2]) for (const zoom of [1, 1.25]) for (const size of [20, 32, 64, 96]) {
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: dpr, mobile: false });
      await evaluate(`document.body.style.zoom=${JSON.stringify(String(zoom))};document.querySelector('#grid')._graphicsSurface.resize(${size});SM.editor.setPrimary(SM.editor.tileAt(1,0));SM.editor.setCursor(0,0);true`);
      const cellRect = await evaluate('(() => {const cell=Array.from(document.querySelectorAll("#grid .cell")).find(e=>e.dataset.x==="1"&&e.dataset.y==="0");cell.scrollIntoView({block:"center"});const r=cell.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
      for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: cellRect.x, y: cellRect.y, button: 'left', clickCount: 1 });
      assert.deepEqual(await evaluate('SM.editor.cursorPos()'), { x: 1, y: 0 }, JSON.stringify({ dpr, zoom, size, cellRect }));
      for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      assert.deepEqual(await evaluate('SM.editor.cursorPos()'), { x: 2, y: 0 });
      assert.equal(await evaluate('document.querySelector("#grid")._graphicsSurface.dpr'), dpr);
      assert.equal(await evaluate('document.querySelector("#grid")._graphicsSurface.layers.every(l=>l.getContext()._context.imageSmoothingEnabled===' + (identity === 'vector' ? 'true' : 'false') + ')'), true);
      evidence.editor.coordinateMatrix.push({ dpr, cssZoom: zoom, cellPixels: size, pointerMatches: true });
    }
    await evaluate('document.body.style.zoom="1";true');
    const shiftedTile = await evaluate('SM.editor.tileAt(3,0)');
    await evaluate('SM.editor.setPrimary(0);true');
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, modifiers: 8 });
    assert.deepEqual(await evaluate('SM.editor.cursorPos()'), { x: 3, y: 0 });
    assert.equal(await evaluate('SM.editor.tileAt(3,0)'), 0);
    await click('#btn-undo'); assert.equal(await evaluate('SM.editor.tileAt(3,0)'), shiftedTile);
    evidence.editor.pointerCoordinatesDPR2 = true;
    evidence.performance = await evaluate(`(() => {
      SM.PRESENTATION.set({motion:'full'});
      const base=Konva.stages.length, host=document.createElement('div');document.body.appendChild(host);
      const fixture={width:16,height:9,outcome:'playing',rays:[],cells:Array.from({length:144},(_,i)=>({x:i%16,y:Math.floor(i/16),label:'Presentation stress fixture '+i,layers:[SM.VISUALS.describe(SM.TILES[60+i%8],{P:'red',W:'blu'})]}))};
      const surface=new SM.Surface(host,{cellSize:32,identity:${JSON.stringify(identity)}});surface.update(fixture);
      const animatedGlyphs=Array.from(surface.groups.values()).filter(r=>r.group.getChildren().some(n=>n._smAnimation)).length;
      const times=[];for(let i=0;i<60;i++){const start=performance.now();surface.tick();surface.stage.draw();if(i>=10)times.push(performance.now()-start)}
      times.sort((a,b)=>a-b);const p95=times[Math.floor(times.length*.95)];surface.dispose();host.remove();
      for(let i=0;i<100;i++){const h=document.createElement('div');document.body.appendChild(h);const s=new SM.Surface(h,{cellSize:20,static:true,identity:i%2?'pixel':'vector'});s.update(fixture);s.dispose();if(s.clock.isRunning()||s.groups.size)throw Error('Disposed surface retained resources');h.remove()}
      if(Konva.stages.length!==base)throw Error('Stage leak');
      const h=document.createElement('div');document.body.appendChild(h);const keys=SM.SPRITES.keys;SM.SPRITES.keys=keys.filter(k=>k!=='conveyor');
      try{const s=new SM.Surface(h,{identity:'pixel',static:true});s.update(fixture);if(!s.fallbacks||!h.getAttribute('aria-description'))throw Error('Missing pixel fallback diagnostic');s.dispose()}finally{SM.SPRITES.keys=keys;h.remove()}
      const getContext=HTMLCanvasElement.prototype.getContext, unavailable=document.createElement('div');document.body.appendChild(unavailable);
      try{HTMLCanvasElement.prototype.getContext=()=>null;const state=SM.RULES.cloneState(SM.editor.quickTestState()),r=new SM.Renderer(document,{board:unavailable});r.build(state);if(!r.surface.error)throw Error('Missing Canvas failure message');const view=SM.RULES.cloneState(state),result=SM.RULES.resolveTurn(state,{type:'move',dir:'east'});let completed=0;r.play(result.steps,view,()=>completed++);if(completed!==1||r.sequence)throw Error('Canvas failure left playback hanging');r.dispose()}finally{HTMLCanvasElement.prototype.getContext=getContext;unavailable.remove()}
      SM.PRESENTATION.set({motion:'reduced'});
      return {p95WorkMs:p95,samples:times.length,cells:144,animatedGlyphs,dpr:2,viewport:[1280,960],rebuildCycles:100,stageCountReturnedToBaseline:Konva.stages.length===base,caches:SM.GRAPHICS.cacheStats(),missingPixelFallback:true,canvasUnavailable:true};
    })()`);
    assert.ok(evidence.performance.p95WorkMs <= 16.7, JSON.stringify(evidence.performance));
    assert.equal(evidence.performance.animatedGlyphs, 144);
    assert.equal(evidence.performance.stageCountReturnedToBaseline, true);
    assert.ok(evidence.performance.caches.atlases <= 128 && evidence.performance.caches.previews <= 256);
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    report.pageErrors = errors; report.externalResources = external; report.passed = true;
  } catch (error) {
    report.error = error.stack || String(error); throw error;
  } finally {
    report.pageErrors = errors; report.externalResources = external;
    if (fs.existsSync(OUTPUT) && JSON.parse(fs.readFileSync(OUTPUT, 'utf8')).generatedBy !== report.generatedBy) throw new Error('refusing to overwrite non-generated Chromium evidence');
    fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + '\n');
    for (const operation of pending.values()) { clearTimeout(operation.timeout); operation.reject(new Error('Chromium check finished')); }
    if (socket) socket.close(); browser.kill('SIGTERM');
    console.log(JSON.stringify({ passed: report.passed, packs: report.packs.length, gallery: !!report.gallery,
      browser: report.browser && report.browser.product, screenshots: directory, report: path.relative(ROOT, OUTPUT) }));
  }
}
module.exports = { presentationFingerprint };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
