/**
 * pdf-report.js — Real PDF generation for SmartCityAI report exports
 * ================================================================
 * Builds true, selectable-text A4 PDFs (not HTML files, not screenshots)
 * for:
 *   SC_PDF.buildStructured(jsPDF, data)  — "Download PDF"  (tables + analysis)
 *   SC_PDF.buildVisual(jsPDF, data)      — "Download Report" (charts + trends)
 *
 * Everything is drawn with jsPDF primitives (text, rects, lines, circles),
 * so the output opens in any PDF reader, is searchable and printable.
 *
 * UMD wrapper so the same file works as a browser global (SC_PDF) and as a
 * CommonJS module (for headless testing with Node).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SC_PDF = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── Page geometry (A4, millimetres) ───────────────────────────── */
  var A4 = { w: 210, h: 297 };
  var M = { l: 18, r: 18, t: 16, b: 18 };
  var CW = A4.w - M.l - M.r;      // 174mm content width
  var BOTTOM = A4.h - M.b;        // 279mm content limit

  /* ── Palette (mirrors the web report styling) ──────────────────── */
  var C = {
    ink: '#0f172a', ink2: '#334155', muted: '#64748b', faint: '#94a3b8',
    line: '#e2e8f0', line2: '#f1f5f9', panel: '#f8fafc', headBg: '#f1f5f9',
    headInk: '#475569',
    indigo: '#6366f1', indigoDark: '#4f46e5', purple: '#7c3aed',
    orange: '#f97316', green: '#22c55e', greenDark: '#16a34a',
    red: '#dc2626', amber: '#d97706', blue: '#3b82f6'
  };

  /* ── Small utilities ───────────────────────────────────────────── */
  function rgb(hex) {
    hex = String(hex || '#000000').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ];
  }
  function setFill(doc, hex) { var c = rgb(hex); doc.setFillColor(c[0], c[1], c[2]); }
  function setDraw(doc, hex) { var c = rgb(hex); doc.setDrawColor(c[0], c[1], c[2]); }
  function setInk(doc, hex) { var c = rgb(hex); doc.setTextColor(c[0], c[1], c[2]); }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b), o = '#';
    for (var i = 0; i < 3; i++) {
      var v = Math.round(x[i] * (1 - t) + y[i] * t);
      o += (v < 16 ? '0' : '') + v.toString(16);
    }
    return o;
  }

  /**
   * Make a string safe for the PDF standard fonts (Latin-1 only):
   * ₹ → "Rs. ", typographic punctuation → ASCII, emoji/pictographs removed.
   */
  function sanitize(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/₹/g, 'Rs. ')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2022/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0E}\u{FE0F}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[^\u0000-\u00FF]/g, '');
  }

  function wrap(doc, text, width) {
    var out = doc.splitTextToSize(sanitize(text), Math.max(10, width));
    return Array.isArray(out) ? out : [String(out)];
  }

  function riskColorOf(risk) {
    return { CRITICAL: C.red, HIGH: C.orange, MEDIUM: C.amber, LOW: C.green }[risk] || C.indigo;
  }
  function fmt(v, dp) { var n = Number(v); if (!isFinite(n)) return '-'; return n.toFixed(dp); }

  /* ── Layout cursor with automatic page breaks ──────────────────── */
  function makeLayout(doc) {
    var y = M.t;
    return {
      get y() { return y; },
      set y(v) { y = v; },
      space: function (n) { y += n; },
      newPage: function () { doc.addPage(); y = M.t; },
      ensure: function (h) { if (y + h > BOTTOM) { doc.addPage(); y = M.t; } }
    };
  }

  /* ── Shrink a heading until it fits the content width ──────────── */
  function fitFontSize(doc, text, maxWidth, size, minSize) {
    var s = size;
    doc.setFontSize(s);
    while (doc.getTextWidth(sanitize(text)) > maxWidth && s > minSize) {
      s -= 0.5;
      doc.setFontSize(s);
    }
    return s;
  }

  /* ── Page header (brand / title / subtitle / accent rule) ──────── */
  function drawHeader(L, doc, o) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setInk(doc, o.accent);
    doc.text(sanitize(o.brand).toUpperCase(), A4.w / 2, M.t + 4, { align: 'center', charSpace: 2 });

    doc.setFont('helvetica', 'bold');
    setInk(doc, C.ink);
    fitFontSize(doc, o.title, CW, o.titleSize || 17, 11);
    doc.text(sanitize(o.title), A4.w / 2, M.t + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setInk(doc, C.muted);
    doc.text(sanitize(o.sub), A4.w / 2, M.t + 21, { align: 'center' });

    setDraw(doc, o.accent);
    doc.setLineWidth(1.1);
    doc.line(M.l, M.t + 26, A4.w - M.l, M.t + 26);

    L.y = M.t + 33;
  }

  /* ── Numbered / titled section heading with underline ──────────── */
  /* `need` = vertical space the first block after the heading requires,
     so a heading is never stranded alone at the bottom of a page.      */
  function sectionHeading(L, doc, text, gapBefore, need) {
    var gap = gapBefore === undefined ? 6 : gapBefore;
    L.ensure(gap + 14 + (need || 0));
    L.space(gap);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setInk(doc, C.ink);
    fitFontSize(doc, text, CW, 12, 9);
    doc.text(sanitize(text), M.l, L.y + 5);
    L.y += 8;
    setDraw(doc, C.line);
    doc.setLineWidth(0.4);
    doc.line(M.l, L.y, M.l + CW, L.y);
    L.y += 5;
  }

  /* ── Wrapped paragraph ─────────────────────────────────────────── */
  function paragraph(L, doc, text, o) {
    o = o || {};
    var fs = o.size || 10;
    var lh = o.lineHeight || fs * 0.5;
    var width = o.width || CW;
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
    doc.setFontSize(fs);
    setInk(doc, o.color || C.ink2);
    var ls = wrap(doc, text, width);
    for (var i = 0; i < ls.length; i++) {
      L.ensure(lh + 1);
      doc.text(ls[i], o.x === undefined ? M.l : o.x, L.y + fs * 0.35);
      L.y += lh;
    }
    return ls.length;
  }

  /* ── Bulleted list ─────────────────────────────────────────────── */
  function bullets(L, doc, items, o) {
    o = o || {};
    var fs = o.size || 9.5, lh = 5;
    items.forEach(function (it) {
      var ls = wrap(doc, it, CW - 8);
      L.ensure(lh + 2);
      setFill(doc, o.bulletColor || C.indigo);
      doc.circle(M.l + 1.6, L.y + fs * 0.35 - 1.1, 0.9, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fs);
      setInk(doc, C.ink2);
      for (var i = 0; i < ls.length; i++) {
        L.ensure(lh + 1);
        doc.text(ls[i], M.l + 7, L.y + fs * 0.35);
        L.y += lh;
      }
      L.y += 1.5;
    });
  }

  /* ── KPI cards row ─────────────────────────────────────────────── */
  function kpiRow(L, doc, items, o) {
    o = o || {};
    var gap = 3, h = o.h || 21;
    var w = (CW - gap * (items.length - 1)) / items.length;
    L.ensure(h + 6);
    items.forEach(function (k, i) {
      var x = M.l + i * (w + gap);
      setFill(doc, k.bg || C.panel);
      doc.roundedRect(x, L.y, w, h, 2.5, 2.5, 'F');
      setFill(doc, k.color);
      doc.rect(x + 2, L.y + 0.4, w - 4, 1.3, 'F');
      setDraw(doc, k.border || C.line);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, L.y, w, h, 2.5, 2.5, 'S');

      doc.setFont('helvetica', 'bold');
      setInk(doc, k.color);
      fitFontSize(doc, k.value, w - 4, o.valueSize || 15, 9);
      doc.text(sanitize(k.value), x + w / 2, L.y + 11.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setInk(doc, C.muted);
      var lbl = wrap(doc, k.label, w - 4);
      doc.text(lbl[0] || '', x + w / 2, L.y + 17, { align: 'center' });
      if (lbl[1]) doc.text(lbl[1], x + w / 2, L.y + 19.6, { align: 'center' });
    });
    L.y += h + 6;
  }

  /* ── Generic table (repeats its header on every new page) ──────── */
  function drawTable(L, doc, cols, rows, o) {
    o = o || {};
    var fs = o.fontSize || 9.5;
    var lh = fs * 0.5;
    var padX = 2.5, padY = 2.2, headH = 8, minRow = 7.5;
    var widths = cols.map(function (c) { return c.w; });

    function cellObj(c) {
      if (c && typeof c === 'object') return c;
      return { text: c };
    }
    function cellLines(c, w) { return wrap(doc, cellObj(c).text, w - padX * 2); }
    function rowHeight(cells) {
      var max = 1;
      cells.forEach(function (c, i) { max = Math.max(max, cellLines(c, widths[i]).length); });
      return Math.max(minRow, max * lh + padY * 2);
    }

    function paintHead() {
      setFill(doc, C.headBg);
      doc.rect(M.l, L.y, CW, headH, 'F');
      var x = M.l;
      cols.forEach(function (c, i) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        setInk(doc, C.headInk);
        var ax = c.align === 'center' ? x + widths[i] / 2
          : c.align === 'right' ? x + widths[i] - padX : x + padX;
        doc.text(sanitize(c.label).toUpperCase(), ax, L.y + headH / 2 + 1.4, { align: c.align || 'left' });
        x += widths[i];
      });
      L.y += headH;
    }

    L.ensure(headH + minRow);
    paintHead();

    rows.forEach(function (row) {
      var cells = Array.isArray(row)
        ? row
        : cols.map(function (c) { return row[c.key]; });
      var h = rowHeight(cells);
      if (L.y + h > BOTTOM) { L.newPage(); paintHead(); }

      if (o.zebra) {
        setFill(doc, o.zebra);
        doc.rect(M.l, L.y, CW, h, 'F');
      }
      var x = M.l;
      cells.forEach(function (c, i) {
        var obj = cellObj(c);
        var col = cols[i];
        doc.setFont('helvetica', obj.bold ? 'bold' : 'normal');
        doc.setFontSize(obj.size || fs);
        setInk(doc, obj.color || C.ink);
        var align = obj.align || col.align || 'left';
        var ls = cellLines(c, widths[i]);
        var ax = align === 'center' ? x + widths[i] / 2
          : align === 'right' ? x + widths[i] - padX : x + padX;
        var ty = L.y + padY + (obj.size || fs) * 0.35;
        for (var j = 0; j < ls.length; j++) {
          doc.text(ls[j], ax, ty, { align: align });
          ty += lh;
        }
        x += widths[i];
      });
      setDraw(doc, C.line);
      doc.setLineWidth(0.2);
      doc.line(M.l, L.y + h, M.l + CW, L.y + h);
      L.y += h;
    });
    L.y += 3;
  }

  /* ── Two-column meta box ───────────────────────────────────────── */
  function metaBox(L, doc, items) {
    var h = 21;
    L.ensure(h + 5);
    setFill(doc, C.panel);
    setDraw(doc, C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(M.l, L.y, CW, h, 2.5, 2.5, 'FD');
    items.forEach(function (it, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var x = M.l + 7 + col * (CW / 2);
      var y = L.y + 8 + row * 7.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      setInk(doc, C.ink2);
      doc.text(sanitize(it.label), x, y);
      var lw = doc.getTextWidth(sanitize(it.label)) + 3;
      setInk(doc, it.color || C.ink);
      doc.text(sanitize(it.value), x + lw, y);
    });
    L.y += h + 5;
  }

  /* ── Highlight / info box (used for the risk assessment) ───────── */
  function infoBox(L, doc, o) {
    var h = o.h || 19;
    L.ensure(h + 4);
    setFill(doc, o.fill || C.panel);
    setDraw(doc, o.border || C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(M.l, L.y, CW, h, 2.5, 2.5, 'FD');

    setFill(doc, mix(o.accent, '#ffffff', 0.86));
    doc.circle(M.l + 10, L.y + h / 2, 5.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setInk(doc, o.accent);
    doc.text('!', M.l + 10, L.y + h / 2 + 1.6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    setInk(doc, C.ink);
    doc.text(sanitize(o.title), M.l + 20, L.y + 8);
    var tw = doc.getTextWidth(sanitize(o.title)) + 2;
    setInk(doc, o.accent);
    doc.text(sanitize(o.value), M.l + 20 + tw, L.y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setInk(doc, C.muted);
    doc.text(sanitize(o.sub), M.l + 20, L.y + 14);
    L.y += h + 5;
  }

  /* ── Horizontal bar chart (metric comparison) ──────────────────── */
  function bars(L, doc, items) {
    items.forEach(function (b) {
      L.ensure(10.5);
      var y = L.y;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setInk(doc, C.ink2);
      doc.text(sanitize(b.label), M.l + 36, y + 5, { align: 'right' });

      var tx = M.l + 42, tw = CW - 42;
      setFill(doc, '#e5e7eb');
      doc.roundedRect(tx, y + 1, tw, 6.8, 1.6, 1.6, 'F');
      var pct = Math.max(2, Math.min(100, Number(b.pct) || 0));
      var fw = tw * pct / 100;
      setFill(doc, b.color);
      doc.roundedRect(tx, y + 1, fw, 6.8, 1.6, 1.6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      if (fw > 16) {
        setInk(doc, '#ffffff');
        doc.text(sanitize(b.value), tx + fw - 2.5, y + 5.7, { align: 'right' });
      } else {
        setInk(doc, C.ink2);
        doc.text(sanitize(b.value), tx + fw + 2.5, y + 5.7, { align: 'left' });
      }
      L.y += 10.5;
    });
    L.y += 2;
  }

  /* ── Line chart (vector, drawn with jsPDF primitives) ──────────── */
  function lineChart(L, doc, cfg) {
    var h = cfg.height || 62;
    L.ensure(h + 8);
    var x0 = M.l, y0 = L.y, w = CW;
    setFill(doc, C.panel);
    setDraw(doc, C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(x0, y0, w, h, 2.5, 2.5, 'FD');

    var pl = x0 + 14, pr = x0 + w - 7, pt = y0 + 13, pb = y0 + h - 11;
    var years = cfg.years || [];
    var n = years.length;
    if (n < 2) { L.y = y0 + h + 6; return; }

    var max = cfg.max;
    if (!max) {
      max = 0;
      cfg.series.forEach(function (s) {
        s.data.forEach(function (v) { if (v > max) max = v; });
      });
      max = max * 1.1 || 1;
    }
    var px = function (i) { return pl + i * (pr - pl) / (n - 1); };
    var py = function (v) { return pb - (v / max) * (pb - pt); };

    // horizontal grid
    for (var g = 0; g <= 3; g++) {
      var gy = pt + (pb - pt) * g / 3;
      setDraw(doc, '#eaeef5');
      doc.setLineWidth(0.2);
      doc.line(pl, gy, pr, gy);
    }
    setDraw(doc, C.line);
    doc.setLineWidth(0.3);
    doc.line(pl, pb, pr, pb);

    // series
    cfg.series.forEach(function (s) {
      setDraw(doc, s.color);
      doc.setLineWidth(0.7);
      for (var i = 1; i < n; i++) {
        doc.line(px(i - 1), py(s.data[i - 1]), px(i), py(s.data[i]));
      }
      setFill(doc, s.color);
      for (var j = 0; j < n; j++) doc.circle(px(j), py(s.data[j]), 0.75, 'F');
      if (cfg.showValues && s.label) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        setInk(doc, s.color);
        for (var k = 0; k < n; k++) {
          doc.text(fmt(s.data[k], s.dp === undefined ? 1 : s.dp), px(k), py(s.data[k]) - 1.9, { align: 'center' });
        }
      }
    });

    // legend (multi-series charts)
    if (cfg.series.length > 1) {
      var lx = pl + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      cfg.series.forEach(function (s) {
        setFill(doc, s.color);
        doc.rect(lx, y0 + 5, 3.2, 3.2, 'F');
        setInk(doc, C.ink2);
        doc.text(sanitize(s.label), lx + 4.4, y0 + 7.9);
        lx += 4.4 + doc.getTextWidth(sanitize(s.label)) + 7;
      });
    }

    // x axis labels
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    setInk(doc, C.faint);
    for (var q = 0; q < n; q++) {
      if (q % 2 === 0) doc.text(String(years[q]), px(q), pb + 5.5, { align: 'center' });
    }
    L.y = y0 + h + 6;
  }

  /* ── Risk gauge (score + progress bar + caption) ───────────────── */
  function gauge(L, doc, o) {
    var h = 30;
    L.ensure(h + 6);
    var y0 = L.y;
    setFill(doc, C.panel);
    setDraw(doc, C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(M.l, y0, CW, h, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setInk(doc, o.color);
    doc.text('Overall Risk: ' + sanitize(o.risk), A4.w / 2, y0 + 9, { align: 'center' });

    var bw = CW - 50, bx = M.l + 25, by = y0 + 14;
    setFill(doc, '#e5e7eb');
    doc.roundedRect(bx, by, bw, 7, 3.5, 3.5, 'F');
    var fw = Math.max(6, bw * Math.min(100, Math.max(0, o.pct)) / 100);
    setFill(doc, o.color);
    doc.roundedRect(bx, by, fw, 7, 3.5, 3.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setInk(doc, fw > 14 ? '#ffffff' : C.ink2);
    doc.text(Math.round(o.pct) + '%', fw > 14 ? bx + fw - 3 : bx + fw + 3, by + 5,
      { align: fw > 14 ? 'right' : 'left' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setInk(doc, C.muted);
    doc.text(sanitize(o.caption), A4.w / 2, y0 + h - 5, { align: 'center' });
    L.y = y0 + h + 6;
  }

  /* ── Card with a coloured left accent (insights / recommendations) ─ */
  function accentCard(L, doc, o) {
    doc.setFont('helvetica', 'bold');
    var titleSize = o.titleSize || 9.5;
    doc.setFontSize(titleSize);
    var titleLines = wrap(doc, o.title, CW - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(o.size || 8.8);
    var bodyLines = wrap(doc, o.desc, CW - 16);
    var metaLines = o.meta ? wrap(doc, o.meta, CW - 16) : [];

    var lhT = titleSize * 0.5, lhB = (o.size || 8.8) * 0.55;
    var h = 4 + titleLines.length * lhT + 1.5 + bodyLines.length * lhB
      + (metaLines.length ? 1.5 + metaLines.length * 4.2 : 0) + 4;
    /* `reserve` keeps room for the closing block so it never lands alone */
    L.ensure(h + 4 + (o.reserve || 0));

    var x = M.l, y = L.y;
    setFill(doc, o.fill || C.panel);
    doc.roundedRect(x, y, CW, h, 2, 2, 'F');
    setFill(doc, o.accent);
    doc.rect(x, y + 1, 1.3, h - 2, 'F');

    var tx = x + 6, ty = y + 4 + titleSize * 0.35;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(titleSize);
    setInk(doc, o.titleColor || C.ink);
    doc.text(sanitize(titleLines[0]), tx, ty);
    if (o.tag) {
      var tw = doc.getTextWidth(sanitize(titleLines[0])) + 3;
      setInk(doc, o.tagColor || o.accent);
      doc.text(sanitize(o.tag), tx + tw, ty);
    }
    for (var i = 1; i < titleLines.length; i++) {
      ty += lhT;
      doc.text(sanitize(titleLines[i]), tx, ty);
    }

    ty += lhT + 1.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(o.size || 8.8);
    setInk(doc, C.ink2);
    bodyLines.forEach(function (ln) {
      doc.text(ln, tx, ty);
      ty += lhB;
    });

    if (metaLines.length) {
      ty += 1.5;
      doc.setFontSize(8);
      setInk(doc, C.muted);
      metaLines.forEach(function (ln) {
        doc.text(ln, tx, ty);
        ty += 4.2;
      });
    }
    L.y = y + h + 3.5;
  }

  /* ── Report footer + page numbers (added to every page) ────────── */
  function finish(L, doc, footerLeft) {
    var total = doc.internal.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      doc.setPage(i);
      setDraw(doc, C.line);
      doc.setLineWidth(0.3);
      doc.line(M.l, BOTTOM + 4, A4.w - M.l, BOTTOM + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setInk(doc, C.faint);
      doc.text(sanitize(footerLeft), M.l, BOTTOM + 8.5);
      doc.text('Page ' + i + ' of ' + total, A4.w - M.l, BOTTOM + 8.5, { align: 'right' });
    }
    doc.setPage(total);
    return doc;
  }

  /* ══════════════════════════════════════════════════════════════
   * STRUCTURED REPORT — executive summary, tables, ML analysis,
   * AI insights and recommendations.
   * ══════════════════════════════════════════════════════════════ */
  function buildStructured(jsPDF, d) {
    var doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var L = makeLayout(doc);
    var accent = C.indigoDark;

    drawHeader(L, doc, {
      accent: accent,
      brand: 'SmartCityAI',
      title: 'India Urban Intelligence Analysis Report',
      titleSize: 17,
      sub: 'Generated on ' + d.dateStr + ' at ' + d.timeStr
    });

    metaBox(L, doc, [
      { label: 'City:', value: d.city },
      { label: 'Year:', value: String(d.year) },
      { label: 'Prediction Model:', value: d.model, color: C.indigo },
      { label: 'Report Date:', value: d.dateStr + ' ' + d.timeStr }
    ]);

    /* 1. Executive summary */
    sectionHeading(L, doc, '1. Executive Summary', 4, 14);
    paragraph(L, doc, d.execSummary, { size: 10, lineHeight: 5.2 });

    /* 2. City information & key metrics */
    sectionHeading(L, doc, '2. City Information & Key Metrics', 6, 28);
    kpiRow(L, doc, [
      { value: fmt(d.p, 2) + 'M', label: 'Population', color: C.purple, bg: C.panel },
      { value: fmt(d.t, 1), label: 'Traffic Index', color: C.indigo, bg: C.panel },
      { value: fmt(d.a, 0), label: 'AQI \u00B7 ' + d.aqiLabel, color: C.orange, bg: C.panel },
      { value: fmt(d.gi, 0) + '%', label: 'Green Cover', color: C.green, bg: C.panel }
    ]);
    infoBox(L, doc, {
      accent: riskColorOf(d.risk),
      title: 'Risk Assessment:',
      value: d.risk,
      sub: 'Traffic: ' + (d.t > 80 ? 'Severe' : d.t > 55 ? 'Moderate' : 'Manageable')
        + '  \u00B7  AQI: ' + d.aqiLabel
        + '  \u00B7  Population Pressure: ' + (d.p > 20 ? 'High' : d.p > 12 ? 'Moderate' : 'Low')
    });

    /* 3. Forecast table */
    sectionHeading(L, doc, '3. Prediction Analysis \u2014 75-Year Forecast', 6, 20);
    drawTable(L, doc, [
      { label: 'Year', w: 26, align: 'left' },
      { label: 'Traffic', w: 30, align: 'right' },
      { label: 'AQI', w: 28, align: 'right' },
      { label: 'Population', w: 40, align: 'right' },
      { label: 'Risk Level', w: 50, align: 'left' }
    ], (d.forecast || []).map(function (r) {
      return [
        { text: String(r.year), bold: true },
        { text: fmt(r.traffic, 1), align: 'right' },
        { text: fmt(r.aqi, 0), align: 'right' },
        { text: fmt(r.population, 2) + 'M', align: 'right' },
        { text: r.risk, bold: true, color: riskColorOf(r.risk) }
      ];
    }), { fontSize: 9.5 });

    /* 4. Machine learning analysis */
    sectionHeading(L, doc, '4. Machine Learning Analysis', 6, 22);
    paragraph(L, doc,
      'SmartCityAI employs three machine learning models for urban prediction. '
      + 'Below is the model comparison for ' + d.city + ' in ' + d.year + ':',
      { size: 9.8, lineHeight: 5 });
    drawTable(L, doc, [
      { label: 'Model', w: 34, align: 'left' },
      { label: 'Traffic', w: 30, align: 'right' },
      { label: 'AQI', w: 28, align: 'right' },
      { label: 'Population', w: 40, align: 'right' },
      { label: 'Accuracy', w: 42, align: 'right' }
    ], (d.models || []).map(function (m) {
      return [
        { text: m.name, bold: true },
        { text: fmt(m.traffic, 1), align: 'right' },
        { text: fmt(m.aqi, 0), align: 'right' },
        { text: fmt(m.population, 2) + 'M', align: 'right' },
        { text: m.accuracy, bold: true, color: C.indigo, align: 'right' }
      ];
    }), { fontSize: 9.5 });
    paragraph(L, doc,
      'The ' + d.model + ' model is currently active. LSTM provides the highest accuracy '
      + 'for time-series urban data.',
      { size: 8.5, lineHeight: 4.6, color: C.muted });

    /* 5. AI insights */
    sectionHeading(L, doc, '5. AI Insights', 6, 14);
    paragraph(L, doc,
      'Based on the prediction analysis, the following key findings have been identified for '
      + d.city + ':', { size: 9.8, lineHeight: 5 });
    bullets(L, doc, d.insights || [], { bulletColor: accent });

    /* 6. Recommendations */
    sectionHeading(L, doc, '6. Recommendations', 6, 26);
    (d.recs || []).forEach(function (r) {
      var pc = riskColorOf(r.priority === 'STRATEGIC' ? 'CRITICAL' : r.priority);
      if (r.priority === 'STRATEGIC') pc = C.purple;
      if (r.priority === 'MEDIUM') pc = C.amber;
      accentCard(L, doc, {
        accent: pc,
        fill: mix(pc, '#ffffff', 0.95),
        title: r.title,
        titleColor: C.ink,
        tag: '[' + r.priority + ']',
        tagColor: pc,
        desc: r.description,
        meta: 'Impact: ' + r.impact + '  \u00B7  Timeline: ' + r.timeline + '  \u00B7  Cost: ' + r.cost,
        size: 8.8,
        reserve: 17
      });
    });

    /* Footer */
    L.space(5);
    L.ensure(17);
    setDraw(doc, C.line);
    doc.setLineWidth(0.5);
    doc.line(M.l, L.y, M.l + CW, L.y);
    L.y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setInk(doc, accent);
    doc.text('SMARTCITYAI', A4.w / 2, L.y, { align: 'center', charSpace: 1.5 });
    L.y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setInk(doc, C.faint);
    doc.text('India Urban Prediction Platform \u00B7 ' + d.yearNow
      + ' \u00B7 Powered by LSTM, Random Forest & Linear Regression',
      A4.w / 2, L.y, { align: 'center' });

    return finish(L, doc, 'SmartCityAI Structured Report \u00B7 ' + d.city + ' \u00B7 ' + d.year + ' \u00B7 ' + d.model);
  }

  /* ══════════════════════════════════════════════════════════════
   * VISUALIZED DATA REPORT — KPIs, bar comparison, trend charts,
   * risk gauge, model performance and key insights.
   * ══════════════════════════════════════════════════════════════ */
  function buildVisual(jsPDF, d) {
    var doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var L = makeLayout(doc);
    var accent = C.greenDark;

    drawHeader(L, doc, {
      accent: accent,
      brand: 'SmartCityAI',
      title: 'Urban Data Visualization Report',
      titleSize: 17,
      sub: d.city + ' \u00B7 ' + d.year + ' \u00B7 ' + d.model + ' \u00B7 ' + d.dateStr
    });

    kpiRow(L, doc, [
      { value: fmt(d.p, 2) + 'M', label: 'Population', color: C.purple, bg: '#f0fdf4', border: '#bbf7d0' },
      { value: fmt(d.t, 1), label: 'Traffic Index', color: C.indigo, bg: '#f0fdf4', border: '#bbf7d0' },
      { value: fmt(d.a, 0), label: 'AQI \u00B7 ' + d.aqiLabel, color: C.orange, bg: '#f0fdf4', border: '#bbf7d0' },
      { value: fmt(d.gi, 0) + '%', label: 'Green Cover', color: C.green, bg: '#f0fdf4', border: '#bbf7d0' }
    ], { h: 22 });

    sectionHeading(L, doc, 'Metric Comparison', 4, 16);
    bars(L, doc, d.bars || []);

    sectionHeading(L, doc, 'Population Growth Trend (' + (d.series && d.series.years ? d.series.years[0] : '') + '\u20132100)', 6, 70);
    lineChart(L, doc, {
      years: d.series.years,
      height: 64,
      showValues: true,
      series: [{ label: 'Population (M)', color: C.purple, data: d.series.pop, dp: 1 }]
    });

    sectionHeading(L, doc, 'Traffic & AQI Trend', 6, 70);
    lineChart(L, doc, {
      years: d.series.years,
      height: 64,
      showValues: false,
      series: [
        { label: 'Traffic Index', color: C.indigo, data: d.series.traf, dp: 1 },
        { label: 'AQI', color: C.orange, data: d.series.aqi, dp: 0 }
      ]
    });

    sectionHeading(L, doc, 'Urban Risk Assessment', 6, 36);
    gauge(L, doc, {
      risk: d.risk,
      pct: d.riskPct,
      color: riskColorOf(d.risk),
      caption: 'Traffic index ' + fmt(d.t, 1) + ' \u00B7 AQI ' + fmt(d.a, 0)
        + ' \u00B7 Population ' + fmt(d.p, 2) + 'M \u00B7 Green cover ' + fmt(d.gi, 0) + '%'
    });

    sectionHeading(L, doc, 'Model Performance', 6, 22);
    drawTable(L, doc, [
      { label: 'Model', w: 34, align: 'left' },
      { label: 'Traffic', w: 30, align: 'right' },
      { label: 'AQI', w: 28, align: 'right' },
      { label: 'Population', w: 40, align: 'right' },
      { label: 'Accuracy', w: 42, align: 'right' }
    ], (d.models || []).map(function (m) {
      return [
        { text: m.name, bold: true },
        { text: fmt(m.traffic, 1), align: 'right' },
        { text: fmt(m.aqi, 0), align: 'right' },
        { text: fmt(m.population, 2) + 'M', align: 'right' },
        { text: m.accuracy, bold: true, color: C.greenDark, align: 'right' }
      ];
    }), { fontSize: 9.5 });

    sectionHeading(L, doc, 'Key Insights', 6, 26);
    var LEVELS = {
      good: { accent: C.greenDark, fill: '#f0fdf4' },
      warn: { accent: C.amber, fill: '#fef3c7' },
      danger: { accent: C.red, fill: '#fef2f2' }
    };
    (d.insights || []).forEach(function (ins) {
      var st = LEVELS[ins.level] || LEVELS.good;
      accentCard(L, doc, {
        accent: st.accent,
        fill: st.fill,
        title: ins.title,
        titleColor: st.accent,
        desc: ins.desc,
        size: 8.8,
        reserve: 17
      });
    });

    L.space(5);
    L.ensure(17);
    setDraw(doc, C.line);
    doc.setLineWidth(0.5);
    doc.line(M.l, L.y, M.l + CW, L.y);
    L.y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setInk(doc, accent);
    doc.text('SMARTCITYAI', A4.w / 2, L.y, { align: 'center', charSpace: 1.5 });
    L.y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setInk(doc, C.faint);
    doc.text('India Urban Prediction Platform \u00B7 ' + d.yearNow + ' \u00B7 Visual Data Report',
      A4.w / 2, L.y, { align: 'center' });

    return finish(L, doc, 'SmartCityAI Visual Report \u00B7 ' + d.city + ' \u00B7 ' + d.year + ' \u00B7 ' + d.model);
  }

  return {
    buildStructured: buildStructured,
    buildVisual: buildVisual,
    sanitize: sanitize,
    riskColor: riskColorOf,
    A4: A4,
    COLORS: C
  };
});
