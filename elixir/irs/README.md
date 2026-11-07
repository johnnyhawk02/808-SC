# Reverb impulse responses

The built-in IRs for Elixir 808's reverb (`app/irverb.js`). "plate" and "gated 80s" are made in the app, not files.
These ten come from the [Reverb.js](https://github.com/andigamesandmusic/reverb.js) library, which collects them from the
[OpenAIR](https://www.openair.hosted.york.ac.uk/) acoustic impulse response library and from its author, Andi. Each is
converted to 16-bit stereo WAV at 44.1 kHz, trimmed where it falls 60 dB below its peak (5 s at most), faded over its
last 50 ms and normalised. They keep their own licences (below); the converted files are shared under the same terms.

| File | Shown as | Source | Licence |
| --- | --- | --- | --- |
| wood-shop.wav | wood shop | OpenAIR, [Basement](http://www.openairlib.net/auralizationdb/content/basement) | Public domain (CC0) |
| living-room.wav | living room | OpenAIR, [Domestic living room](http://www.openairlib.net/auralizationdb/content/domestic-living-room) | Public domain (CC0) |
| small-church.wav | small church | OpenAIR, [Saint Lawrence Church, Molenbeek-Wersbeek](http://www.openairlib.net/auralizationdb/content/saint-lawrence-church-molenbeek-wersbeek-belgium) | Public domain (CC0) |
| rail-tunnel.wav | rail tunnel | OpenAIR, [Purnodes railroad tunnel](http://www.openairlib.net/auralizationdb/content/railroad-tunnel-purnodes-tunnel) | Public domain (CC0) |
| empty-bedroom.wav | empty bedroom | OpenAIR, [Empty apartment bedroom](http://www.openairlib.net/auralizationdb/content/empty-apartment-bedroom) | Public domain (CC0) |
| club-hall.wav | club hall | OpenAIR, [Spokane Woman's Club](http://www.openairlib.net/auralizationdb/content/spokane-womans-club) | [CC BY](https://creativecommons.org/licenses/by/3.0/) |
| inside-piano.wav | inside piano | Andi (2013), inside a Yamaha baby grand, damper pedal down (Reverb.js) | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) |
| car-park.wav | car park | OpenAIR (2014), [Underground car park](http://www.openairlib.net/auralizationdb/content/underground-car-park) | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) |
| midiverb-ii.wav | midiverb ii | Andi (2011), preset 29 of an Alesis Midiverb II (Reverb.js) | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) |
| cathedral.wav | cathedral | OpenAIR, [York Minster](http://www.openairlib.net/auralizationdb/content/york-minster) | [CC BY-SA](http://creativecommons.org/licenses/by-sa/3.0/) |
