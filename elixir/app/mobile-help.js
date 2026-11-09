// ---- help (options › help, or h; on a phone the HELP ME! button): getting started first, then a tab each for the pages and the features ----
const HELP = [
  ['start', 'getting started', `<p>808 SC is a drum machine playing the sixteen TR-808 sounds, each one as a circuit simulation (played from hits it renders in advance) or as a synthetic version that is far lighter on the CPU. Three steps to a beat:</p>
<ol><li>Press <b>play</b> (or space).</li><li>Press <b>everything</b> until you like what you hear: each press is a new beat, effects and mix.</li>
<li>Paint steps on the <b>grid</b>, turn a sound's knobs, or press <b>pattern</b>, <b>random fx</b> or <b>alter fx</b> to change one part. <b>undo</b> takes back the last one.</li></ol>
<p>The screen: the title line has the logo (click it for the options menu), <b>rnd</b> (the randomise buttons, in a pop-up), <b>undo</b>, the circuit and synthetic keys with the CPU readout, then <b>play</b> and <b>rec</b>. Under it, one page at a time: <b>grid</b>, <b>fx · master</b>, <b>mix</b> and <b>prst</b>. The generator has no page of its own: it opens over the grid while it plays.</p>
<p>Drag a knob or fader up or down, or scroll on it; double-click to reset it. When you like the sound, <b>prst</b> › <b>save new</b>. <b>rec</b> records a WAV.</p>
<p>(In a window under 1000 px wide it becomes the narrow layout: pages along the bottom, with the perform knobs on their own page.)</p>`],
  ['sounds', 'the two engines', `<p>Each sound plays one of two engines, picked on its card (grid page, right) or for every sound at once with the keys on top:</p>
<ul><li><b>circuit</b> (the default): the 808's schematic simulated part by part, sample by sample. Live it's heavy (a busy pattern can need most of a CPU core), so it plays hits it rendered in advance, at almost no CPU. Level, snap and accent stay live; while you turn the other knobs the sound plays on the circuit so you hear them, and when you move on to another sound or page it renders fresh hits at those settings by itself, then goes back to its hits. It records one hit (plus an accented one) by default; <b>cached hits per sound</b> in the options menu (or settings) records 4, 8 or 16 for more variety, and re-records the sounds you've edited. A reload part-way through an edit still caches that sound.</li>
<li><b>synthetic</b>: a simplified circuit, built from a few oscillators, filters and envelopes. Its knobs are live and mean the same as the circuit's, and its levels are matched to the circuit at the default settings.</li></ul>
<p>The <b>cpu</b> readout beside them shows how much of the audio thread's time the sound takes; it turns dark at 80%.</p>`],
  ['grid', 'grid: patterns and sounds', `<p>Eight patterns (the <b>1</b> to <b>8</b> buttons, or keys 1 to 8), each a lane for each of the sixteen sounds, sixteen steps a bar and up to four bars.</p>
<ul><li>Press a step and drag across others to paint: starting on an empty step puts notes on, on a full one takes them off. With cmd (ctrl) held it puts accents on or takes them off.</li>
<li>The bar buttons under the grid show each bar; <b>−</b> takes the last bar off and <b>+</b> adds a copy of the one shown. <b>◀</b> and <b>▶</b> move the whole pattern a step earlier or later.</li>
<li><b>generator</b> opens the generator over the grid and plays its pattern instead (it covers the steps; <b>insert into pattern</b> writes what it plays into the pattern picked); the <b>bpm</b> box beside it is the tempo, there all the time; your first edit makes it a pattern of your own.</li>
<li>Right-click a pattern's number to record into it: from the next bar what you hear is written into it until you press it again.</li>
<li>cmd (ctrl) + c copies the pattern, cmd + v pastes it over the one picked.</li>
<li>On the right, the card of the sound picked (click its name above): its model and its knobs.</li></ul>`],
  ['beat', 'generator: the pattern', `<ul><li>It lies over the grid while the grid's <b>generator</b> button is on; <b>insert into pattern</b> writes what it plays into the pattern picked and closes it; a pattern button closes it without writing.</li><li><b>tempo</b>; <b>genre</b> picks a style, <b>beat</b> one of its grooves, <b>energy</b> how busy it is, <b>fills</b> how often it fills.</li>
<li><b>velocity</b>; <b>groove</b> and <b>depth</b> give it swing or push; <b>accent</b> how loud the accents are.</li>
<li><b>rush</b> builds a roll: the chosen sound (<b>rush on</b>) rolls faster and faster while the others drop out and a high-pass rises. Push it up for a build, drop it for the drop. Its curve is in <b>options</b> › <b>settings</b> › <b>rush</b>.</li>
<li><b>density</b>, a fader for each of the generator's seven tracks (named after the sound each one plays): under 100% it thins that track, off-beats first; over 100% it adds hits on its empty steps, eighths first, until at 200% every step plays. The same steps go or come each time, and presets keep it.</li></ul>`],
  ['fx', 'fx · master: echo, reverb and the master chain', `<ul><li><b>echo</b>: time (musical lengths, or free with <b>sync</b> off), tone, feedback, width and fine; tick <b>ping pong</b> to bounce it left and right.</li>
<li><b>reverb</b>: a convolution reverb, a recorded space (its impulse response, IR) put on the sound. Pick the IR in its header: a plate and a gated 80s one made here, or ten recorded rooms (wood shop to cathedral, from the OpenAIR library). <b>load IR</b> takes your own (a wav or other audio file; up to 5 s of it is used). Knobs: pre (the delay before it), length, low cut, tone, width, and the <b>gate</b>: each hit into the reverb opens it for a note length at the tempo, and <b>gate fine</b> stretches or shortens that by up to 50%.</li>
<li>Each sound's echo and reverb sends are on the <b>mix</b> page.</li></ul>
<p>Under them, the master chain; the whole mix runs through it top to bottom:</p>
<ul><li><b>bd sidechain</b>: the bass drum ducks the rest; the meter shows how much. <b>space</b> carves the kick's room out of the others.</li>
<li><b>distortion</b>: mix, type, drive, colour, tone and volume.</li><li><b>compressor</b>: glues it together; the meter shows the gain reduction.</li></ul>`],
  ['mix', 'mix: the channel strips', `<p>A strip for each of the sixteen sounds: its echo send, reverb send and pan knobs over its level fader, with a level meter beside it.</p>`],
  ['prst', 'prst: presets', `<ul><li>Click a preset to load it: while playing it flashes until the next bar, then takes over. Untick the tempo box to keep your tempo.</li>
<li>Type in the search box (or press /) to find one by name; enter loads the first found, esc clears it.</li>
<li>The star makes it a favourite (favourites are listed first).</li>
<li><b>save new</b> keeps what you hear, all of it: every sound's model, knobs, levels, pans and sends, the effects, the tempo and the eight patterns; <b>save over</b> replaces the one loaded. <b>reset sound</b> in the options menu goes back to a plain 808 (default knobs, no effects) and keeps the patterns.</li>
<li><b>export presets</b> saves your presets to a file (it never deletes anything); <b>import</b> reads one back, or drop the file anywhere on the page.</li></ul>`],
  ['rec', 'recording', `<ul><li><b>rec</b> records a WAV: press it to start (it starts playing too), again to stop, and the file downloads.</li>
<li>Hold or right-click <b>rec</b> to choose what it records: <b>free</b>, or an exact loop of 1, 2, 4, 8, 16, 32, 64 or 128 bars. A loop starts at the next bar, shows its progress on the button and downloads by itself, cut to repeat seamlessly in any other app.</li></ul>`],
  ['keys', 'keyboard and mouse', `<ul><li><b>space</b> play and stop. <b>enter</b> record, <b>l</b> record a loop. <b>u</b> undo.</li>
<li><b>1</b> to <b>8</b> pick the grid's pattern; <b>cmd</b> (or <b>ctrl</b>) + <b>c</b> copies the pattern, <b>cmd</b> + <b>v</b> pastes it over the one picked.</li>
<li><b>o</b> presets, <b>/</b> search presets, <b>?</b> help. <b>esc</b> closes whatever is open.</li>
<li>Click a knob or fader, then the arrow keys step it. Scroll on one with the mouse wheel or trackpad to turn it.</li>
<li>Right-click a knob or fader for its step sequencer and reset. Double-click one to reset it.</li></ul>`],
  ['more', 'more', `<ul><li>The options menu (click the logo) holds randomise on next bar, assign knobs, the bass drum at the top of the grid, reset sound, and:</li>
<li><b>background colour</b>: any colour for the panel, kept in this browser; the ink and the logo follow it (<b>background back to default</b> undoes it). <b>spot colour</b>: one colour for what is on or lit (pressed buttons, the page tab, play, the model keys; the grid's notes stay in the ink); red by default; <b>spot back to default</b> undoes a change.</li>
<li><b>settings</b>: copy the knob assignments or your presets, export or clear presets, and the <b>rush</b> graph of how the rush builds (drag its squares).</li>
<li><b>user settings</b>: <b>midi</b>, which CC moves each knob; <b>seq</b>, whether step sequencers follow the groove.</li>
<li>Install it as an app from your browser's menu; it works offline.</li>
<li>The version number is beside the logo; the latest arrives when you open it with a connection (cmd+shift+R to be sure).</li></ul>`],
];
let mHelpTab = 0;
function mHelpDraw() {
  const tabs = $('m-help-tabs'); tabs.innerHTML = '';
  HELP.forEach(([name], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'tab'); b.textContent = name;
    b.setAttribute('aria-selected', i === mHelpTab); b.addEventListener('click', () => { mHelpTab = i; mHelpDraw(); }); tabs.append(b);
  });
  const [, title, body] = HELP[mHelpTab];
  $('m-help-text').innerHTML = `<h3>${title}</h3>${body}`; $('m-help-text').scrollTop = 0;
}
$('m-help-open').addEventListener('click', () => { mHelpTab = 0; mHelpDraw(); $('m-help').hidden = false; });
mCloser('m-help');
