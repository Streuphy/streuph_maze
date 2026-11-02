/* GPL-3.0. Shared glyph consumer facade; geometry/pixels live in one backend. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  SM.GLYPHS = {
    describe: function (inst, view) { return SM.VISUALS.describe(inst, view); },
    markup: function (inst, view, size) {
      var d = SM.VISUALS.describe(inst, view), theme = SM.PRESENTATION.settings.theme;
      try { return '<img class="glyph-image" width="' + (size || 24) + '" height="' + (size || 24) + '" alt="' + escape(SM.VISUALS.label(d)) +
        '" src="' + SM.GRAPHICS.thumbnail([d], theme, size || 24) + '" style="image-rendering:' + (theme === 'pixel' ? 'pixelated' : 'auto') + '">'; }
      catch (error) { return '<span role="img" aria-label="' + escape(error.message + '; ' + SM.VISUALS.label(d)) + '">' + escape(d.key) + '</span>'; }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
