/*
 * Anonymous counts of what happens in the game: a visit, a game started, a
 * game ended, an error. They tell which game is too hard or gets abandoned,
 * and on which phones. Never who: no cookie, no identifier, nothing stored on
 * the device for this. See docs/telemetry.md.
 *
 * Do Not Track switches it off. It only runs on the live site, and a failure
 * here must never reach the player: offline, the counts are simply lost.
 */
(function () {
  'use strict';
  var JK = window.JK = window.JK || {};
  var ENDPOINT = '/api/beacon';
  var MAX_PER_PAGE = 60;
  var nav = window.navigator || {};
  var sent = 0;

  var on = JK.version !== 'dev' && location.protocol === 'https:' &&
    nav.doNotTrack !== '1' && window.doNotTrack !== '1' && !nav.globalPrivacyControl;

  /* One line, without addresses: an error message can carry the URL of the page. */
  function redact(raw) {
    return String(raw == null ? '' : raw).split(/\r?\n/, 1)[0]
      .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s'"`<>()[\]{}]*/gi, '<url>')
      .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '<email>')
      .replace(/\s+/g, ' ').trim().slice(0, 300);
  }

  function track(type, data) {
    if (!on || sent >= MAX_PER_PAGE) return;
    sent++;
    try {
      var body = { type: type, rev: JK.version }, k;
      for (k in data) if (Object.prototype.hasOwnProperty.call(data, k)) body[k] = data[k];
      var json = JSON.stringify(body);
      // sendBeacon still delivers while the page is being closed.
      if (nav.sendBeacon && nav.sendBeacon(ENDPOINT, new Blob([json], { type: 'application/json' }))) return;
      fetch(ENDPOINT, { method: 'POST', body: json, keepalive: true, headers: { 'content-type': 'application/json' } })
        .catch(function () { /* offline: lost */ });
    } catch (e) { /* a count is never worth breaking the game for */ }
  }

  /* The page was opened. Chrome names the phone's model only when asked, so ask, but do not wait long. */
  function visit(data) {
    if (!on) return;
    var done = false;
    function send(model) {
      if (done) return;
      done = true;
      if (model) data.model = model;
      track('visit', data);
    }
    try {
      data.width = window.innerWidth;
      data.installed = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || nav.standalone === true;
      if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
        nav.userAgentData.getHighEntropyValues(['model'])
          .then(function (v) { send(v && v.model); }, function () { send(); });
        setTimeout(send, 1500);
        return;
      }
    } catch (e) { /* send what there is */ }
    send();
  }

  if (on) {
    window.addEventListener('error', function (e) {
      var message = redact(e && e.message);
      if (message) track('error', { message: message });
    });
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e && e.reason;
      var message = redact(reason && reason.message ? reason.message : reason);
      if (message) track('error', { message: message });
    });
  }

  JK.telemetry = { on: on, track: track, visit: visit, redact: redact };
})();
