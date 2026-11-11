/* Every picture is drawn here in SVG, so there are no image files to download. */
(function () {
  'use strict';
  var JK = window.JK;
  var S = JK.art = {};

  var TIGER =
    '<circle cx="24" cy="24" r="13" fill="#f28c28"/><circle cx="76" cy="24" r="13" fill="#f28c28"/>' +
    '<circle cx="24" cy="25" r="6" fill="#fff3df"/><circle cx="76" cy="25" r="6" fill="#fff3df"/>' +
    '<ellipse cx="50" cy="56" rx="38" ry="35" fill="#f28c28"/>' +
    '<ellipse cx="37" cy="70" rx="15" ry="12" fill="#fff3df"/><ellipse cx="63" cy="70" rx="15" ry="12" fill="#fff3df"/>' +
    '<path d="M50 22v12M40 25l2 9M60 25l-2 9M13 52l10 3M14 63h9M87 52l-10 3M86 63h-9" stroke="#3b2414" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<circle cx="36" cy="51" r="5.5" fill="#2b1a0e"/><circle cx="64" cy="51" r="5.5" fill="#2b1a0e"/>' +
    '<circle cx="37.5" cy="49.5" r="1.8" fill="#fff"/><circle cx="65.5" cy="49.5" r="1.8" fill="#fff"/>' +
    '<path d="M44 61h12l-6 7z" fill="#d9486e"/>' +
    '<path d="M50 68v5M50 73q-5 5-10 1M50 73q5 5 10 1" stroke="#3b2414" stroke-width="2.5" stroke-linecap="round" fill="none"/>';

  /* The inside of each icon, drawn in a 100 x 100 box. */
  var icons = S.icons = {
    tiger: TIGER,

    tapir:
      '<path d="M40 100Q36 66 58 54Q84 44 96 70V100z" fill="#f4f1ea"/>' +
      '<path d="M40 100Q34 70 52 56Q62 50 70 56Q60 76 66 100z" fill="#2a2a2e"/>' +
      '<ellipse cx="47" cy="27" rx="8" ry="11" fill="#2a2a2e"/><ellipse cx="47" cy="23" rx="4" ry="5" fill="#f4f1ea"/>' +
      '<ellipse cx="40" cy="50" rx="25" ry="22" fill="#2a2a2e"/>' +
      '<path d="M22 50Q6 54 8 74Q9 82 16 80Q21 78 20 70Q20 64 30 62z" fill="#2a2a2e"/>' +
      '<circle cx="34" cy="45" r="5" fill="#fff"/><circle cx="33" cy="45" r="2.6" fill="#111"/>',

    bear:
      '<circle cx="22" cy="28" r="12" fill="#2b2320"/><circle cx="78" cy="28" r="12" fill="#2b2320"/>' +
      '<circle cx="22" cy="29" r="5" fill="#5a463c"/><circle cx="78" cy="29" r="5" fill="#5a463c"/>' +
      '<ellipse cx="50" cy="55" rx="38" ry="35" fill="#2b2320"/>' +
      '<path d="M26 86Q50 104 74 86Q70 100 50 100T26 86z" fill="#f2c36b"/>' +
      '<ellipse cx="50" cy="67" rx="19" ry="15" fill="#e8c9a0"/>' +
      '<ellipse cx="50" cy="60" rx="7.5" ry="5" fill="#1a1412"/>' +
      '<path d="M50 65v6M50 71q-5 4-9 0M50 71q5 4 9 0" stroke="#1a1412" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
      '<circle cx="35" cy="48" r="5" fill="#fff"/><circle cx="65" cy="48" r="5" fill="#fff"/>' +
      '<circle cx="35.5" cy="48.5" r="2.8" fill="#111"/><circle cx="64.5" cy="48.5" r="2.8" fill="#111"/>',

    hornbill:
      '<path d="M26 100Q18 60 40 42Q54 32 66 42Q74 50 70 62Q64 74 62 100z" fill="#1f1f24"/>' +
      '<path d="M40 100Q38 84 50 78Q60 84 60 100z" fill="#f4f1ea"/>' +
      '<circle cx="50" cy="40" r="20" fill="#1f1f24"/>' +
      '<path d="M62 36Q88 34 97 52Q78 50 62 54z" fill="#ffd34d"/>' +
      '<path d="M56 26Q70 8 90 15Q79 18 75 30Q66 28 56 30z" fill="#f2672a"/>' +
      '<circle cx="54" cy="38" r="5" fill="#fff"/><circle cx="55" cy="38" r="2.6" fill="#b3261e"/>',

    siamang:
      '<ellipse cx="50" cy="48" rx="38" ry="40" fill="#1c1c1f"/>' +
      '<ellipse cx="50" cy="46" rx="25" ry="23" fill="#55555c"/>' +
      '<ellipse cx="50" cy="86" rx="21" ry="14" fill="#c4aaa4"/>' +
      '<circle cx="39" cy="41" r="5.5" fill="#fff"/><circle cx="61" cy="41" r="5.5" fill="#fff"/>' +
      '<circle cx="39.5" cy="41.5" r="3" fill="#3b2414"/><circle cx="60.5" cy="41.5" r="3" fill="#3b2414"/>' +
      '<ellipse cx="50" cy="56" rx="11" ry="8" fill="#2a2a2e"/>' +
      '<path d="M44 58q6 5 12 0" stroke="#c4aaa4" stroke-width="2.5" stroke-linecap="round" fill="none"/>',

    shoot:
      '<path d="M50 94V56" stroke="#4d8f2f" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M50 62Q18 56 12 22Q46 26 50 62z" fill="#8fdc55"/>' +
      '<path d="M50 62Q82 56 88 22Q54 26 50 62z" fill="#6fca3f"/>' +
      '<path d="M50 54Q40 30 50 6Q60 30 50 54z" fill="#c6f38e"/>' +
      '<path d="M22 30Q38 40 48 58M78 30Q62 40 52 58" stroke="#4d8f2f" stroke-width="2" fill="none" opacity=".5"/>',

    caterpillar:
      '<path d="M14 72Q26 42 40 64Q52 84 64 60Q72 46 82 54" fill="none" stroke="#f2a03d" stroke-width="19" stroke-linecap="round"/>' +
      '<path d="M14 72Q26 42 40 64Q52 84 64 60Q72 46 82 54" fill="none" stroke="#e2622f" stroke-width="19" stroke-linecap="round" stroke-dasharray="3 20"/>' +
      '<circle cx="84" cy="50" r="14" fill="#f7c948"/>' +
      '<circle cx="79" cy="47" r="2.8" fill="#222"/><circle cx="89" cy="47" r="2.8" fill="#222"/>' +
      '<path d="M79 55q5 4 10 0" stroke="#222" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M78 37l-4-10M90 37l4-10" stroke="#b5451b" stroke-width="3" stroke-linecap="round"/>',

    fish:
      '<path d="M28 50L4 28Q11 50 4 72z" fill="#e8892b"/>' +
      '<path d="M22 50Q56 12 94 50Q56 88 22 50z" fill="#f5b942"/>' +
      '<path d="M48 30Q60 16 74 32z" fill="#e8892b"/>' +
      '<path d="M40 44q6 6 0 12M54 39q9 11 0 22" stroke="#d98a1e" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="78" cy="44" r="5.5" fill="#fff"/><circle cx="79" cy="44" r="2.8" fill="#222"/>',

    hyacinth:
      '<ellipse cx="50" cy="70" rx="42" ry="20" fill="#2f8f4e"/>' +
      '<ellipse cx="27" cy="58" rx="19" ry="12" fill="#49b566" transform="rotate(-22 27 58)"/>' +
      '<ellipse cx="73" cy="58" rx="19" ry="12" fill="#49b566" transform="rotate(22 73 58)"/>' +
      '<ellipse cx="50" cy="68" rx="21" ry="12" fill="#63cc7c"/>' +
      '<path d="M50 56V30" stroke="#2f8f4e" stroke-width="4"/>' +
      '<circle cx="42" cy="34" r="7.5" fill="#c4b5fd"/><circle cx="58" cy="34" r="7.5" fill="#c4b5fd"/>' +
      '<circle cx="50" cy="25" r="9.5" fill="#a78bfa"/><circle cx="50" cy="27" r="3.2" fill="#fde047"/>',

    boat:
      '<g transform="translate(24 0) scale(.5)">' + TIGER + '</g>' +
      '<path d="M82 52L90 24" stroke="#6b3a1f" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="90" cy="16" r="9" fill="rgba(255,255,255,.45)" stroke="#6b3a1f" stroke-width="3"/>' +
      '<path d="M2 50H98Q90 82 70 84H30Q10 82 2 50z" fill="#8a4b2a"/>' +
      '<path d="M2 50H98L95 59H5z" fill="#b06a3f"/>' +
      '<path d="M22 70H78" stroke="#6b3a1f" stroke-width="3" stroke-linecap="round" opacity=".5"/>',

    cinnamon:
      '<g transform="rotate(-18 50 50)">' +
      '<rect x="10" y="28" width="80" height="15" rx="7.5" fill="#a0522d"/>' +
      '<rect x="10" y="45" width="80" height="15" rx="7.5" fill="#8b4513"/>' +
      '<rect x="10" y="62" width="80" height="15" rx="7.5" fill="#b5651d"/>' +
      '<circle cx="84" cy="35.5" r="4.5" fill="#5c2e0e"/><circle cx="84" cy="52.5" r="4.5" fill="#5c2e0e"/><circle cx="84" cy="69.5" r="4.5" fill="#5c2e0e"/>' +
      '<rect x="43" y="24" width="13" height="57" rx="3" fill="#f0dfae"/>' +
      '</g>',

    coffee:
      '<g transform="rotate(-18 36 54)"><ellipse cx="36" cy="54" rx="24" ry="32" fill="#6f4e37"/><path d="M32 26Q46 54 34 82" stroke="#3b2414" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
      '<g transform="rotate(16 70 50)"><ellipse cx="70" cy="50" rx="19" ry="26" fill="#8b5e3c"/><path d="M67 28Q78 50 68 72" stroke="#3b2414" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>',

    potato:
      '<path d="M16 56Q12 26 44 22Q84 16 88 50Q90 82 54 84Q20 86 16 56z" fill="#d9a85b"/>' +
      '<path d="M30 36Q44 27 60 31" stroke="#f0cf95" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<ellipse cx="38" cy="52" rx="4.5" ry="2.8" fill="#a87a35"/><ellipse cx="62" cy="46" rx="4.5" ry="2.8" fill="#a87a35"/>' +
      '<ellipse cx="54" cy="66" rx="4.5" ry="2.8" fill="#a87a35"/><ellipse cx="74" cy="60" rx="4" ry="2.5" fill="#a87a35"/>',

    rice:
      '<path d="M46 96Q48 56 62 16" stroke="#8a9a2a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M46 96Q40 70 16 58" stroke="#6da544" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<g fill="#f2c230" stroke="#c9960c" stroke-width="1.5">' +
      '<ellipse cx="66" cy="16" rx="5" ry="9" transform="rotate(28 66 16)"/><ellipse cx="74" cy="26" rx="5" ry="9" transform="rotate(48 74 26)"/>' +
      '<ellipse cx="58" cy="30" rx="5" ry="9" transform="rotate(-10 58 30)"/><ellipse cx="76" cy="40" rx="5" ry="9" transform="rotate(58 76 40)"/>' +
      '<ellipse cx="56" cy="46" rx="5" ry="9" transform="rotate(-14 56 46)"/><ellipse cx="74" cy="54" rx="5" ry="9" transform="rotate(64 74 54)"/>' +
      '<ellipse cx="53" cy="62" rx="5" ry="9" transform="rotate(-16 53 62)"/><ellipse cx="68" cy="68" rx="5" ry="9" transform="rotate(66 68 68)"/>' +
      '</g>',

    gong:
      '<path d="M12 12H88M22 12V30M78 12V30" stroke="#6b3a1f" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="50" cy="60" r="34" fill="#c9951a"/><circle cx="50" cy="60" r="25" fill="#f2c94c"/><circle cx="50" cy="60" r="10" fill="#b8860b"/>',

    drum:
      '<path d="M20 32Q50 22 80 32V72Q50 82 20 72z" fill="#a0522d"/>' +
      '<path d="M27 36L73 68M27 68L73 36" stroke="#f3e3c3" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="20" cy="52" rx="9" ry="20" fill="#f3e3c3" stroke="#6b3a1f" stroke-width="3.5"/>' +
      '<ellipse cx="80" cy="52" rx="9" ry="20" fill="#f3e3c3" stroke="#6b3a1f" stroke-width="3.5"/>',

    rebana:
      '<ellipse cx="50" cy="58" rx="40" ry="30" fill="#7a3b12"/>' +
      '<ellipse cx="50" cy="48" rx="40" ry="28" fill="#fbeed3" stroke="#7a3b12" stroke-width="4"/>' +
      '<circle cx="14" cy="64" r="5" fill="#f2c94c"/><circle cx="50" cy="84" r="5" fill="#f2c94c"/><circle cx="86" cy="64" r="5" fill="#f2c94c"/>',

    clap:
      '<path d="M30 84Q12 58 24 34Q31 22 40 32L52 60Q55 78 44 88z" fill="#f2b98a"/>' +
      '<path d="M70 84Q88 58 76 34Q69 22 60 32L48 60Q45 78 56 88z" fill="#e3a070"/>' +
      '<path d="M50 20V6M33 22L26 10M67 22L74 10" stroke="#ffc93c" stroke-width="6" stroke-linecap="round"/>',

    dancer:
      '<path d="M37 40L16 26M63 40L84 26" stroke="#f2b98a" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M42 76L38 95M58 76L62 95" stroke="#2b2118" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M35 36H65L70 68H30z" fill="#c0392b"/>' +
      '<path d="M31 62H69L65 78H35z" fill="#f2c94c"/><path d="M33 68H67" stroke="#c0392b" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<circle cx="50" cy="22" r="14" fill="#f2b98a"/>' +
      '<path d="M36 18Q50 0 64 18Q50 10 36 18z" fill="#2b2118"/><path d="M36 18Q50 9 64 18" stroke="#f2c94c" stroke-width="3.5" fill="none"/>' +
      '<circle cx="45" cy="23" r="2" fill="#2b2118"/><circle cx="55" cy="23" r="2" fill="#2b2118"/>' +
      '<path d="M45 29q5 4 10 0" stroke="#2b2118" stroke-width="2" fill="none" stroke-linecap="round"/>',

    mountain:
      '<ellipse cx="60" cy="10" rx="11" ry="5" fill="#fff" opacity=".9"/>' +
      '<path d="M4 88L44 22Q50 15 56 22L96 88z" fill="#5f7d8c"/>' +
      '<path d="M44 22Q50 15 56 22L67 40L57 36L50 47L42 36L33 40z" fill="#c9d6dc"/>' +
      '<path d="M4 88L24 55Q40 66 50 60Q64 70 78 58L96 88z" fill="#3f8f5f"/>',

    bush:
      '<ellipse cx="50" cy="99" rx="50" ry="7" fill="#1f6b40" opacity=".5"/>' +
      '<path d="M4 100Q-4 70 14 60Q10 36 34 38Q44 22 62 34Q84 28 86 54Q104 64 96 100z" fill="#1f7a45"/>' +
      '<path d="M14 100Q10 78 26 72Q26 54 44 58Q56 46 68 60Q86 60 84 80Q94 88 88 100z" fill="#2f9e5b"/>' +
      '<circle cx="28" cy="84" r="4" fill="#ff9db8"/><circle cx="72" cy="90" r="4" fill="#ffe066"/><circle cx="52" cy="76" r="3" fill="#ff9db8"/>',

    teaBush:
      '<ellipse cx="50" cy="79" rx="50" ry="6" fill="#2f7a3f" opacity=".5"/>' +
      '<path d="M3 80Q-3 46 24 38Q36 16 56 28Q82 20 90 46Q104 60 97 80z" fill="#2f8f4e"/>' +
      '<path d="M12 80Q8 58 30 52Q44 38 58 48Q78 46 82 62Q92 70 88 80z" fill="#4bb563"/>' +
      '<path d="M30 60q6-6 12 0M54 56q6-6 12 0M42 70q6-6 12 0M66 70q5-5 10 0M20 72q5-5 10 0" stroke="#8fdc55" stroke-width="3" fill="none" stroke-linecap="round"/>',

    star: '<path d="M50 6l13 28 31 4-23 21 6 31-27-15-27 15 6-31L6 38l31-4z" fill="currentColor"/>',
    lock: '<path d="M34 46V32a16 16 0 0 1 32 0v14" fill="none" stroke="currentColor" stroke-width="10"/><rect x="20" y="44" width="60" height="46" rx="9" fill="currentColor"/>',
    question: '<path d="M34 36Q34 18 50 18Q68 18 68 34Q68 46 54 52Q50 54 50 64" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><circle cx="50" cy="82" r="7" fill="currentColor"/>',
    hand: '<path d="M40 94Q24 76 22 62Q22 53 30 55L38 63V20Q38 12 46 12Q54 12 54 20V44Q60 40 64 46Q70 42 74 48Q80 46 82 54V72Q82 86 72 94z" fill="#fff" stroke="#2b2118" stroke-width="4" stroke-linejoin="round"/>',
    soundOn: '<path d="M12 38h18l24-20v64L30 62H12z" fill="currentColor"/><path d="M68 35q11 15 0 30M79 23q21 27 0 54" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
    soundOff: '<path d="M12 38h18l24-20v64L30 62H12z" fill="currentColor"/><path d="M68 38l22 24M90 38L68 62" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
    back: '<path d="M60 18L28 50l32 32" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M22 48v38h56V48" fill="currentColor"/><path d="M10 52L50 16l40 36" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="M24 24l52 52M76 24L24 76" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>',
    play: '<path d="M30 14l54 36-54 36z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>',
    redo: '<path d="M80 52a30 30 0 1 1-10-22" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><path d="M74 8v24H50" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
    pin: '<path d="M50 92Q20 58 20 38a30 30 0 0 1 60 0Q80 58 50 92z" fill="currentColor"/><circle cx="50" cy="38" r="11" fill="#fff"/>'
  };

  var viewBoxes = { teaBush: '0 0 100 80' };

  S.icon = function (name, className) {
    return '<svg class="icon' + (className ? ' ' + className : '') + '" viewBox="' + (viewBoxes[name] || '0 0 100 100') +
      '" aria-hidden="true" focusable="false">' + icons[name] + '</svg>';
  };

  /* ---------- Scenery pieces ---------- */

  function volcano(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="8" cy="-114" rx="17" ry="9" fill="#fff" opacity=".85"/><ellipse cx="26" cy="-127" rx="12" ry="7" fill="#fff" opacity=".6"/>' +
      '<path d="M-110 0L-14 -100Q0 -108 14 -100L110 0z" fill="#5f7d8c"/>' +
      '<path d="M-14 -100Q0 -108 14 -100L35 -78L19 -85L6 -70L-8 -87L-31 -74z" fill="#c9d6dc"/>' +
      '<path d="M-110 0L-60 -52Q-22 -30 0 -41Q40 -20 70 -42L110 0z" fill="#3f8f5f"/>' +
      '</g>';
  }

  function cloud(x, y, s, o) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff" opacity="' + (o || 0.9) + '">' +
      '<ellipse cx="0" cy="0" rx="30" ry="12"/><ellipse cx="-14" cy="-8" rx="15" ry="11"/><ellipse cx="10" cy="-11" rx="18" ry="13"/></g>';
  }

  function sky(id, top, bottom) {
    return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top +
      '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs>' +
      '<rect x="-400" y="-600" width="1160" height="1800" fill="url(#' + id + ')"/>';
  }

  function teaRows(y, n, color) {
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<path d="M-20 ' + (y + i * 26) + 'Q90 ' + (y - 34 + i * 26) + ' 180 ' + (y + i * 26) + 'T380 ' + (y - 8 + i * 26) + '"/>';
    }
    return '<g fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" opacity=".55">' + s + '</g>';
  }

  function open(className, viewBox, ratio) {
    return '<svg class="' + className + '" viewBox="' + viewBox + '" preserveAspectRatio="' + ratio + '" aria-hidden="true" focusable="false">';
  }

  var scenes = S.scenes = {};

  scenes.home = open('scene', '0 0 360 640', 'xMidYMax slice') +
    sky('lg-home', '#7cc8ff', '#eaf8ff') +
    '<circle cx="296" cy="150" r="30" fill="#ffd95a"/><circle cx="296" cy="150" r="42" fill="#ffd95a" opacity=".3"/>' +
    cloud(70, 190, 1, 0.9) + cloud(300, 260, 0.8, 0.8) + cloud(40, 330, 0.6, 0.7) +
    volcano(180, 470, 1.45) +
    '<path d="M-20 452Q90 410 190 446T380 436V640H-20z" fill="#63b65a"/>' +
    teaRows(478, 3, '#3f8f4a') +
    '<path d="M-20 540Q110 500 240 536T380 524V640H-20z" fill="#7cc96b"/>' +
    teaRows(566, 3, '#4fa651') +
    '</svg>';

  scenes.tea = open('scene', '0 0 360 560', 'xMidYMax slice') +
    sky('lg-tea', '#8fd3ff', '#e6f7ff') +
    cloud(60, 70, 0.9) + cloud(300, 120, 0.7, 0.8) +
    volcano(180, 236, 1.2) +
    '<path d="M-20 228Q90 190 180 224T380 214V560H-20z" fill="#63b65a"/>' +
    teaRows(252, 2, '#3f8f4a') +
    '<path d="M-20 296Q120 266 240 296T380 288V560H-20z" fill="#7cc96b"/>' +
    teaRows(330, 9, '#5fb85c') +
    '</svg>';

  scenes.lake = open('scene', '0 0 360 560', 'xMidYMin slice') +
    sky('lg-lake', '#3f9fe0', '#1f6fbe') +
    '<rect x="-400" y="-600" width="1160" height="660" fill="#bfe6ff"/>' +
    volcano(250, 62, 0.42) +
    '<path d="M-400 60V40Q-200 30 0 46Q60 20 130 44T260 38T360 46Q500 30 760 40V60z" fill="#4fae5c"/>' +
    '<rect x="-400" y="58" width="1160" height="5" fill="#e9f6ff" opacity=".7"/>' +
    '<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35">' +
    '<path d="M30 120q10-7 20 0t20 0M230 160q10-7 20 0t20 0M110 230q10-7 20 0t20 0M270 300q10-7 20 0t20 0M40 350q10-7 20 0t20 0M180 420q10-7 20 0t20 0M290 480q10-7 20 0t20 0M60 510q10-7 20 0t20 0"/>' +
    '</g></svg>';

  scenes.forest = (function () {
    var s = open('scene', '0 0 360 560', 'xMidYMid slice') + sky('lg-forest', '#c9f0cf', '#8fd6a0');
    // distant trees
    s += '<g fill="#7cc98f">';
    [[20, 150, 60], [100, 120, 70], [190, 140, 64], [270, 115, 72], [345, 150, 58]].forEach(function (p) {
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '"/>';
    });
    s += '</g>';
    // trunks and crowns
    [[40, 0], [150, 30], [250, 10], [330, 40]].forEach(function (p) {
      s += '<rect x="' + (p[0] - 9) + '" y="' + (120 + p[1]) + '" width="18" height="460" fill="#7a4a2b"/>' +
        '<circle cx="' + p[0] + '" cy="' + (110 + p[1]) + '" r="54" fill="#3d9e5f"/>' +
        '<circle cx="' + (p[0] - 34) + '" cy="' + (140 + p[1]) + '" r="34" fill="#348a52"/>' +
        '<circle cx="' + (p[0] + 36) + '" cy="' + (136 + p[1]) + '" r="36" fill="#46ad6a"/>';
    });
    s += '<path d="M-400 470Q100 440 180 462T760 450V1200H-400z" fill="#3a9159"/>' +
      '<path d="M40 60q8 40-6 90M250 70q-10 50 4 110" stroke="#2f7f4a" stroke-width="4" fill="none" stroke-linecap="round"/>';
    return s + '</svg>';
  })();

  scenes.rhythm = (function () {
    var s = open('scene', '0 0 360 300', 'xMidYMax slice') + sky('lg-rhythm', '#ffe2a8', '#fff4dc');
    s += volcano(70, 232, 0.7);
    // a house on stilts
    s += '<path d="M196 150L264 108L332 150z" fill="#8a4b2a"/><rect x="208" y="150" width="112" height="56" fill="#e7c08a"/>' +
      '<rect x="252" y="170" width="24" height="36" fill="#8a4b2a"/><rect x="220" y="166" width="20" height="18" fill="#fff4dc"/><rect x="288" y="166" width="20" height="18" fill="#fff4dc"/>' +
      '<path d="M216 206v26M312 206v26M264 206v26" stroke="#6b3a1f" stroke-width="6"/>';
    s += '<rect x="-400" y="230" width="1160" height="300" fill="#c98f52"/><rect x="-400" y="230" width="1160" height="8" fill="#a8703c"/>';
    // bunting
    s += '<path d="M-40 24Q180 64 400 24" stroke="#6b3a1f" stroke-width="2" fill="none"/>';
    var colors = ['#c0392b', '#f2c94c', '#2b2118'];
    for (var i = 0; i < 11; i++) {
      var x = 12 + i * 34, y = 28 + 20 * Math.sin(Math.PI * (x + 40) / 440);
      s += '<path d="M' + (x - 9) + ' ' + y + 'h18l-9 20z" fill="' + colors[i % 3] + '"/>';
    }
    return s + '</svg>';
  })();

  /* The climb: its posts as points on the 360 x 520 picture. */
  S.mountainPath = [[52, 468], [250, 398], [112, 318], [236, 236], [180, 124]];

  scenes.mountain = (function () {
    var j = S.mountainPath;
    var s = open('scene scene-mountain', '0 0 360 520', 'xMidYMid meet') + sky('lg-mountain', '#6fbfff', '#dff3ff');
    s += '<circle cx="300" cy="70" r="26" fill="#ffd95a"/>';
    s += '<g class="drift">' + cloud(60, 150, 1, 0.9) + cloud(330, 250, 0.9, 0.85) + '</g>';
    s += '<ellipse cx="190" cy="78" rx="26" ry="12" fill="#fff" opacity=".85"/><ellipse cx="214" cy="60" rx="18" ry="9" fill="#fff" opacity=".6"/>';
    // the mountain itself
    s += '<path d="M-420 1200V620L160 112Q180 96 200 112L780 620V1200z" fill="#5f7d8c"/>';
    s += '<path d="M160 112Q180 96 200 112L226 150L204 140L186 164L166 138L134 152z" fill="#c9d6dc"/>';
    s += '<path d="M-420 1200V620L-30 280Q40 330 110 300Q180 340 250 296Q310 340 392 282L780 620V1200z" fill="#6f8a64"/>';
    s += '<path d="M-420 1200V620L-140 376Q-40 420 60 392Q160 440 260 396Q340 440 500 376L780 620V1200z" fill="#3f8f5f"/>';
    // trees at the foot
    [[20, 500], [96, 512], [150, 492], [210, 508], [300, 496], [340, 512], [276, 452], [30, 440]].forEach(function (p) {
      s += '<path d="M' + p[0] + ' ' + (p[1] - 26) + 'l13 30h-26z" fill="#1d6b43"/>';
    });
    // the trail
    var d = 'M' + j.map(function (p) { return p[0] + ' ' + p[1]; }).join('L');
    s += '<path d="' + d + '" fill="none" stroke="#fff3d6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 12"/>';
    j.forEach(function (p, i) {
      if (i === j.length - 1) return;
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="#fff" stroke="#8a4b2a" stroke-width="3"/>';
    });
    // the summit flag, shown at the end
    var summit = j[j.length - 1];
    s += '<g class="flag" transform="translate(' + summit[0] + ' ' + summit[1] + ')"><path d="M0 4V-44" stroke="#6b3a1f" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M2 -44h30v10H2z" fill="#e8553d"/><path d="M2 -34h30v10H2z" fill="#fff"/></g>';
    // the climber
    s += '<g id="climber" transform="translate(' + j[0][0] + ' ' + j[0][1] + ')"><g class="climber-body">' +
      '<ellipse cx="0" cy="6" rx="16" ry="5" fill="#000" opacity=".18"/>' +
      '<svg x="-24" y="-44" width="48" height="48" viewBox="0 0 100 100">' + TIGER + '</svg></g></g>';
    return s + '</svg>';
  })();

  /* ---------- The map of Kerinci ---------- */

  function pin(l, st) {
    var w = l.short.length * 6.3 + 16, badge = '';
    if (st.locked) {
      badge = '<circle cx="19" cy="-19" r="11" fill="#fff"/><svg x="12" y="-26" width="14" height="14" viewBox="0 0 100 100" color="#6b5a48">' + icons.lock + '</svg>';
    } else if (st.stars) {
      badge = '<circle cx="19" cy="-19" r="11" fill="#fff"/><svg x="11" y="-27" width="16" height="16" viewBox="0 0 100 100" color="#f5a800">' + icons.star + '</svg>';
    }
    return '<g class="pin' + (st.locked ? ' pin-locked' : '') + (st.stars ? ' pin-done' : '') + '" data-id="' + l.id +
      '" tabindex="0" role="button" aria-label="' + l.place + (st.locked ? JK.text.locked : '') + '" transform="translate(' + l.x + ' ' + l.y + ')">' +
      (st.locked || st.stars ? '' : '<circle class="pin-pulse" r="26" fill="' + l.color + '"/>') +
      '<circle r="25" fill="#fff"/><circle r="21" fill="' + (st.locked ? '#b9b2a7' : l.color) + '"/>' +
      '<circle r="15" fill="#fff" opacity=".88"/>' +
      '<svg x="-13" y="-13" width="26" height="26" viewBox="0 0 100 100">' + icons[l.icon] + '</svg>' +
      '<rect x="' + (-w / 2) + '" y="28" width="' + w + '" height="18" rx="9" fill="#fff"/>' +
      '<text y="41" text-anchor="middle" class="pin-name">' + l.short + '</text>' +
      badge + '</g>';
  }

  function tree(x, y) {
    return '<path d="M' + x + ' ' + (y - 13) + 'l8 17h-16z" fill="#1d6b43"/><rect x="' + (x - 1.5) + '" y="' + (y + 4) + '" width="3" height="5" fill="#6b3a1f"/>';
  }

  function house(x, y, roof) {
    return '<path d="M' + (x - 9) + ' ' + y + 'l9-8 9 8z" fill="' + roof + '"/><rect x="' + (x - 7) + '" y="' + y + '" width="14" height="9" fill="#fff4dc"/>';
  }

  S.map = function (status) {
    var s = open('map-svg', '0 0 360 500', 'xMidYMid meet');
    s += '<rect x="-500" y="-500" width="1360" height="1500" fill="#9ad97f"/>';
    // the national park forest on both sides of the valley
    s += '<path d="M-500 -500H84Q100 60 72 130Q52 200 96 250Q114 300 72 352Q52 420 84 1000H-500z" fill="#3aa565"/>';
    s += '<path d="M860 40H326Q300 120 322 200Q340 270 314 330Q304 362 334 384H860z" fill="#3aa565"/>';
    [[20, 28], [50, 150], [16, 176], [26, 300], [58, 322], [14, 372], [44, 410], [20, 456], [60, 478],
      [340, 140], [326, 196], [346, 246], [330, 302], [348, 350], [10, 96]].forEach(function (p) { s += tree(p[0], p[1]); });
    // the river into the lake, and out of it
    s += '<path d="M206 196Q176 246 198 296Q216 346 204 404" fill="none" stroke="#7cc4f0" stroke-width="5" stroke-linecap="round"/>';
    s += '<path d="M300 458Q330 478 420 474" fill="none" stroke="#4aa8e8" stroke-width="9" stroke-linecap="round"/>';
    // Gunung Kerinci
    s += volcano(118, 122, 0.98);
    // Danau Gunung Tujuh
    s += '<path d="M252 62q7-22 14 0q6-24 14-2q7-24 14 0q7-22 14 2q6-18 14 0v14h-70z" fill="#5f9e6e"/>' +
      '<ellipse cx="290" cy="66" rx="27" ry="12" fill="#4aa8e8"/><ellipse cx="284" cy="63" rx="12" ry="3" fill="#bfe6ff" opacity=".7"/>' +
      '<text x="290" y="94" text-anchor="middle" class="map-label">' + JK.text.mapLake + '</text>';
    // the Kayu Aro tea estate
    s += '<ellipse cx="236" cy="160" rx="76" ry="40" fill="#63b65a"/>' +
      '<g fill="none" stroke="#3f8f4a" stroke-width="4" stroke-linecap="round" opacity=".6">' +
      '<path d="M172 150q64-22 128 0M166 164q70-22 140 0M172 178q64-20 128 0M186 190q50-14 100 0"/></g>';
    // rice fields near Hamparan Rawang
    s += '<g stroke="#c9b24a" stroke-width="1.5"><path d="M214 240h40v22h-40z" fill="#e3d870"/><path d="M256 236h38v24h-38z" fill="#cfe07a"/>' +
      '<path d="M222 264h36v22h-36z" fill="#cfe07a"/><path d="M260 262h36v24h-36z" fill="#e3d870"/></g>';
    // the town of Sungai Penuh
    s += house(104, 330, '#c0392b') + house(124, 352, '#8a4b2a') + house(166, 356, '#c0392b') + house(176, 328, '#8a4b2a') + house(110, 368, '#8a4b2a');
    s += '<path d="M150 318l12-9 12 9z" fill="#2b6b4f"/><path d="M146 326l16-10 16 10z" fill="#2b6b4f"/><path d="M142 335l20-11 20 11z" fill="#2b6b4f"/>' +
      '<rect x="147" y="335" width="30" height="11" fill="#fff4dc"/><path d="M162 309v-7" stroke="#2b6b4f" stroke-width="2"/>';
    // Danau Kerinci
    s += '<path d="M170 424Q198 386 262 398Q320 410 314 450Q300 484 236 480Q176 476 170 424z" fill="#4aa8e8"/>' +
      '<path d="M196 420q8-6 16 0t16 0M250 462q8-6 16 0t16 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>';
    // the road between the places
    s += '<path d="M118 112C150 150 200 130 236 152S276 220 256 264S180 300 138 338S190 400 240 432M138 338C100 320 70 284 54 236" ' +
      'fill="none" stroke="#fff8e1" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10"/>';
    JK.places.forEach(function (l) { s += pin(l, status[l.id] || {}); });
    return s + '</svg>';
  };
})();
