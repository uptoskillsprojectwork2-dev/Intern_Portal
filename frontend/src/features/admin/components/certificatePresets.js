// ============================================================================
// CANVAS PAPER SIZES
// ============================================================================
export const CANVAS_SIZES = {
  "a4-landscape": {
    label: "A4 Landscape",
    width: 1123,
    height: 794,
    aspect: "1123 / 794",
  },
  "a4-portrait": {
    label: "A4 Portrait",
    width: 794,
    height: 1123,
    aspect: "794 / 1123",
  },
  "letter-landscape": {
    label: "US Letter Landscape",
    width: 1100,
    height: 850,
    aspect: "1100 / 850",
  },
  square: {
    label: "Square Digital Badge",
    width: 800,
    height: 800,
    aspect: "1 / 1",
  },
};

// ============================================================================
// PRESET TEMPLATES GALLERY
// ============================================================================
export const PRESET_TEMPLATES = [
  {
    id: "royal-navy-gold",
    name: "Royal Navy & Gold",
    badge: "Executive Prestige",
    colors: ["#0a192f", "#d4af37", "#fdfbf7"],
    description: "Traditional corporate elegance with ornate double-gold borders, gold medallion, and dual signatures.",
    html: `
<div class="cert-container royal-navy-gold">
  <div class="cert-border-outer">
    <div class="cert-border-inner">
      <div class="cert-header">
        <div class="cert-brand">UPTOSKILLS</div>
        <div class="cert-accreditation">OFFICIAL ACCREDITED CREDENTIAL</div>
      </div>

      <div class="cert-headline">
        <h1 class="cert-main-title">CERTIFICATE OF COMPLETION</h1>
        <div class="cert-gold-divider"></div>
        <p class="cert-conferral">THIS IS PROUDLY PRESENTED TO</p>
      </div>

      <div class="cert-recipient-box">
        <h2 class="cert-recipient-name">{{fullName}}</h2>
        <div class="cert-accent-bar"></div>
      </div>

      <div class="cert-description">
        <p>In recognition of successful completion and outstanding performance in the intensive <strong>{{domain}}</strong> program as <strong>{{internshipRole}}</strong>. Having fulfilled all rigorous practical and professional requirements with distinction.</p>
      </div>

      <div class="cert-middle-row">
        <div class="cert-meta-item">
          <span class="cert-meta-label">PROGRAM DURATION</span>
          <span class="cert-meta-value">{{startDate}} — {{endDate}}</span>
        </div>

        <div class="cert-medallion-box">
          <div class="cert-medallion">
            <div class="medallion-inner">
              <span class="medallion-star">★</span>
              <span class="medallion-text">EXCELLENCE</span>
              <span class="medallion-year">2026</span>
            </div>
          </div>
        </div>

        <div class="cert-meta-item text-right">
          <span class="cert-meta-label">DATE OF ISSUANCE</span>
          <span class="cert-meta-value">{{issueDate}}</span>
        </div>
      </div>

      <div class="cert-signatures-row">
        <div class="cert-sig-box">
          <div class="sig-cursive">{{directorName}}</div>
          <div class="sig-border"></div>
          <div class="sig-title">{{directorName}}</div>
          <div class="sig-sub">{{directorTitle}}</div>
        </div>

        <div class="cert-sig-box">
          <div class="sig-cursive">Academic Lead</div>
          <div class="sig-border"></div>
          <div class="sig-title">Program Director</div>
          <div class="sig-sub">UPTOSKILLS Academy</div>
        </div>
      </div>

      <div class="cert-footer-row">
        <div class="cert-id-tag">Certificate ID: <strong>{{certificateNumber}}</strong></div>
        <div class="cert-dot">•</div>
        <div class="cert-id-tag">Verification Code: <strong>{{verificationCode}}</strong></div>
      </div>
    </div>
  </div>
</div>`,
    css: `
* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
.cert-container.royal-navy-gold {
  width: 1123px;
  min-height: 794px;
  padding: 22px;
  background: #081a36;
  background-color: #081a36 !important;
  color: #172a45;
  font-family: 'Cinzel', Georgia, serif;
  margin: 0 auto;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.cert-border-outer {
  border: 3px solid #d4af37;
  padding: 8px;
  background: #081a36;
  background-color: #081a36 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.cert-border-inner {
  border: 2px solid #b8972e;
  background: #fdfbf7;
  background-color: #fdfbf7 !important;
  padding: 40px 60px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  min-height: 726px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.cert-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cert-brand {
  font-size: 24px;
  letter-spacing: 6px;
  font-weight: 800;
  color: #081a36;
}
.cert-accreditation {
  font-size: 10px;
  letter-spacing: 3px;
  color: #8c7320;
  font-weight: 600;
}
.cert-headline {
  margin: 10px 0;
}
.cert-main-title {
  margin: 0;
  font-size: 38px;
  letter-spacing: 5px;
  color: #081a36;
  font-weight: 800;
}
.cert-gold-divider {
  width: 160px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #d4af37, transparent);
  border-bottom: 2px solid #d4af37;
  margin: 10px auto;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.cert-conferral {
  margin: 0;
  font-size: 12px;
  letter-spacing: 3.5px;
  color: #64748b;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
}
.cert-recipient-box {
  margin: 12px 0 16px;
}
.cert-recipient-name {
  margin: 0;
  font-size: 42px;
  color: #081a36;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  letter-spacing: 1px;
}
.cert-accent-bar {
  width: 280px;
  height: 2px;
  background: #d4af37;
  border-bottom: 2px solid #d4af37;
  margin: 8px auto 0;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.cert-description {
  max-width: 820px;
  font-size: 15px;
  line-height: 1.65;
  color: #334155;
  font-family: 'Montserrat', sans-serif;
  margin: 0 auto;
}
.cert-middle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 880px;
  margin: 14px 0;
  padding: 0 20px;
}
.cert-meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
}
.cert-meta-item.text-right { text-align: right; }
.cert-meta-label {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: #8c7320;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
}
.cert-meta-value {
  font-size: 14px;
  color: #081a36;
  font-weight: 600;
  font-family: 'Montserrat', sans-serif;
}
.cert-medallion-box {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cert-medallion {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: radial-gradient(circle, #fde047 0%, #ca8a04 100%);
  background-color: #ca8a04 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px double #fef08a;
  box-shadow: 0 4px 12px rgba(161, 98, 7, 0.35);
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.medallion-inner {
  text-align: center;
  color: #713f12;
  font-weight: 800;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.medallion-star { font-size: 14px; line-height: 1; }
.medallion-text { font-size: 7.5px; letter-spacing: 1px; font-family: 'Montserrat', sans-serif; }
.medallion-year { font-size: 9px; }
.cert-signatures-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 820px;
  margin: 10px 0;
}
.cert-sig-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 220px;
}
.sig-cursive {
  font-family: 'Great Vibes', cursive;
  font-size: 28px;
  color: #081a36;
  min-height: 34px;
}
.sig-border {
  width: 100%;
  height: 1px;
  background: #94a3b8;
  border-bottom: 1px solid #94a3b8;
  margin: 4px 0 6px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.sig-title {
  font-size: 13px;
  font-weight: 700;
  color: #081a36;
  font-family: 'Montserrat', sans-serif;
}
.sig-sub {
  font-size: 11px;
  color: #64748b;
  font-family: 'Montserrat', sans-serif;
}
.cert-footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 11px;
  color: #64748b;
  font-family: 'Montserrat', sans-serif;
  margin-top: 6px;
}
.cert-dot { color: #d4af37; }
`
  },
  {
    id: "modern-emerald-tech",
    name: "Modern Emerald & Mint",
    badge: "Clean Tech & Startups",
    colors: ["#064e3b", "#10b981", "#ffffff"],
    description: "Contemporary tech aesthetic with emerald gradient ribbons, verified badge pill, and QR verification block.",
    html: `
<div class="cert-container modern-emerald">
  <div class="emerald-top-accent"></div>
  <div class="emerald-inner-sheet">
    <div class="emerald-header">
      <div class="emerald-brand-group">
        <span class="emerald-badge">VERIFIED CREDENTIAL</span>
        <h3 class="emerald-brand-name">UPTOSKILLS ACADEMY</h3>
      </div>
      <div class="emerald-cert-id">ID: {{certificateNumber}}</div>
    </div>

    <div class="emerald-content-core">
      <p class="emerald-pre-title">CERTIFICATE OF ACHIEVEMENT</p>
      <h1 class="emerald-title">INTERNSHIP EXCELLENCE</h1>
      <p class="emerald-awarded-text">THIS CERTIFICATE IS AWARDED TO</p>
      
      <div class="emerald-name-block">
        <h2 class="emerald-name">{{fullName}}</h2>
        <div class="emerald-underline"></div>
      </div>

      <p class="emerald-summary">
        For successfully completing the comprehensive internship program in <strong>{{domain}}</strong>, exhibiting exemplary performance, technical acumen, and dedication from <strong>{{startDate}}</strong> to <strong>{{endDate}}</strong>.
      </p>
    </div>

    <div class="emerald-bottom-grid">
      <div class="emerald-qr-box">
        <div class="emerald-qr-placeholder">QR CODE</div>
        <div class="emerald-qr-caption">Scan to Verify Authenticity<br><strong>{{verificationCode}}</strong></div>
      </div>

      <div class="emerald-date-box">
        <div class="box-label">ISSUED ON</div>
        <div class="box-value">{{issueDate}}</div>
        <div class="box-sub">Authenticated Digital Record</div>
      </div>

      <div class="emerald-signature-box">
        <div class="emerald-sig-name">{{directorName}}</div>
        <div class="emerald-sig-divider"></div>
        <div class="box-label">{{directorTitle}}</div>
        <div class="box-sub">UPTOSKILLS Issuing Authority</div>
      </div>
    </div>
  </div>
</div>`,
    css: `
* { box-sizing: border-box; }
.cert-container.modern-emerald {
  width: 1123px;
  min-height: 794px;
  padding: 30px;
  background: #f0fdf4;
  color: #064e3b;
  font-family: 'Inter', sans-serif;
  margin: 0 auto;
}
.emerald-inner-sheet {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #a7f3d0;
  box-shadow: 0 10px 30px rgba(6, 78, 59, 0.08);
  padding: 44px 54px;
  min-height: 734px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}
.emerald-top-accent {
  height: 8px;
  width: 100%;
  background: linear-gradient(9deg, #059669, #10b981, #34d399);
  border-radius: 12px 12px 0 0;
  margin-bottom: -8px;
  position: relative;
  z-index: 2;
}
.emerald-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.emerald-badge {
  display: inline-block;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #10b981;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 4px 10px;
  margin-bottom: 4px;
}
.emerald-brand-name {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #064e3b;
  letter-spacing: 2px;
}
.emerald-cert-id {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  font-family: monospace;
}
.emerald-content-core {
  text-align: center;
  margin: 16px 0;
}
.emerald-pre-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #059669;
  letter-spacing: 3px;
}
.emerald-title {
  margin: 6px 0 10px;
  font-size: 40px;
  font-weight: 900;
  color: #064e3b;
  letter-spacing: 2px;
}
.emerald-awarded-text {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  letter-spacing: 2px;
}
.emerald-name-block {
  margin: 14px 0 16px;
}
.emerald-name {
  margin: 0;
  font-size: 44px;
  font-weight: 800;
  color: #047857;
}
.emerald-underline {
  width: 220px;
  height: 3px;
  background: #10b981;
  margin: 8px auto 0;
  border-radius: 2px;
}
.emerald-summary {
  max-width: 800px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 1.6;
  color: #374151;
}
.emerald-bottom-grid {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}
.emerald-qr-box {
  display: flex;
  align-items: center;
  gap: 12px;
}
.emerald-qr-placeholder {
  width: 54px;
  height: 54px;
  background: #f3f4f6;
  border: 1px dashed #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #6b7280;
  border-radius: 6px;
  font-weight: bold;
}
.emerald-qr-caption {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}
.emerald-date-box {
  text-align: center;
}
.box-label {
  font-size: 10px;
  font-weight: 700;
  color: #059669;
  letter-spacing: 1px;
}
.box-value {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 2px 0;
}
.box-sub {
  font-size: 10px;
  color: #9ca3af;
}
.emerald-signature-box {
  text-align: right;
  width: 200px;
}
.emerald-sig-name {
  font-family: 'Great Vibes', cursive;
  font-size: 26px;
  color: #064e3b;
  margin-bottom: 4px;
}
.emerald-sig-divider {
  height: 1px;
  background: #9ca3af;
  margin-bottom: 6px;
}
`
  },
  {
    id: "ruby-prestige-honors",
    name: "Ruby Prestige & Burgundy",
    badge: "Distinction & Honors",
    colors: ["#701a35", "#d97706", "#fefdfa"],
    description: "Rich burgundy and gold award styling for top-performing interns and honors recognition.",
    html: `
<div class="cert-container ruby-prestige">
  <div class="ruby-outer-frame">
    <div class="ruby-inner-canvas">
      <div class="ruby-ribbon-badge">★ DISTINCTION AWARD ★</div>
      
      <div class="ruby-issuer">UPTOSKILLS GLOBAL EDUCATION</div>
      
      <h1 class="ruby-headline">CERTIFICATE OF RECOGNITION</h1>
      <p class="ruby-presentation-line">FOR OUTSTANDING PERFORMANCE AND DEDICATION</p>

      <div class="ruby-recipient-zone">
        <p class="ruby-presented-to">PRESENTED TO</p>
        <h2 class="ruby-name">{{fullName}}</h2>
        <div class="ruby-gold-crease"></div>
      </div>

      <p class="ruby-body-text">
        In commendation of exceptional dedication and mastery demonstrated during the <strong>{{domain}}</strong> internship program. Successfully evaluated with distinction on <strong>{{issueDate}}</strong>.
      </p>

      <div class="ruby-details-strip">
        <div class="ruby-detail-item">
          <div class="item-title">INTERN CODE</div>
          <div class="item-value">{{internCode}}</div>
        </div>
        <div class="ruby-detail-item">
          <div class="item-title">DURATION</div>
          <div class="item-value">{{startDate}} — {{endDate}}</div>
        </div>
        <div class="ruby-detail-item">
          <div class="item-title">SECURITY REF</div>
          <div class="item-value">{{verificationCode}}</div>
        </div>
      </div>

      <div class="ruby-signatures">
        <div class="ruby-sig-block">
          <div class="ruby-sig-pen">{{directorName}}</div>
          <div class="ruby-sig-bar"></div>
          <div class="ruby-sig-label">{{directorTitle}}</div>
          <div class="ruby-sig-co">UPTOSKILLS Board of Directors</div>
        </div>

        <div class="ruby-sig-block">
          <div class="ruby-sig-pen">Head of Faculty</div>
          <div class="ruby-sig-bar"></div>
          <div class="ruby-sig-label">Lead Mentor</div>
          <div class="ruby-sig-co">Academic Affairs</div>
        </div>
      </div>

      <div class="ruby-bottom-id">
        Verified Certificate Identification: {{certificateNumber}}
      </div>
    </div>
  </div>
</div>`,
    css: `
* { box-sizing: border-box; }
.cert-container.ruby-prestige {
  width: 1123px;
  min-height: 794px;
  padding: 24px;
  background: #500724;
  color: #3b0716;
  font-family: 'Playfair Display', Georgia, serif;
  margin: 0 auto;
}
.ruby-outer-frame {
  border: 4px double #d97706;
  padding: 8px;
  background: #500724;
}
.ruby-inner-canvas {
  background: #fffefb;
  border: 2px solid #b45309;
  padding: 40px 60px;
  text-align: center;
  min-height: 726px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}
.ruby-ribbon-badge {
  background: #831843;
  color: #fef08a;
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 700;
  padding: 4px 18px;
  border-radius: 9999px;
  border: 1px solid #d97706;
  font-family: 'Montserrat', sans-serif;
}
.ruby-issuer {
  font-size: 18px;
  letter-spacing: 5px;
  font-weight: 700;
  color: #831843;
  margin-top: 10px;
}
.ruby-headline {
  margin: 4px 0 2px;
  font-size: 36px;
  letter-spacing: 4px;
  color: #500724;
  font-weight: 800;
}
.ruby-presentation-line {
  margin: 0;
  font-size: 11px;
  letter-spacing: 3px;
  color: #b45309;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
}
.ruby-recipient-zone {
  margin: 12px 0 10px;
}
.ruby-presented-to {
  margin: 0;
  font-size: 11px;
  letter-spacing: 2.5px;
  color: #71717a;
  font-family: 'Montserrat', sans-serif;
}
.ruby-name {
  margin: 6px 0 0;
  font-size: 42px;
  font-weight: 700;
  color: #831843;
  letter-spacing: 1px;
}
.ruby-gold-crease {
  width: 260px;
  height: 2px;
  background: #d97706;
  margin: 8px auto 0;
}
.ruby-body-text {
  max-width: 800px;
  font-size: 14.5px;
  line-height: 1.6;
  color: #3f3f46;
  font-family: 'Montserrat', sans-serif;
  margin: 0;
}
.ruby-details-strip {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 760px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 16px;
  font-family: 'Montserrat', sans-serif;
}
.ruby-detail-item { text-align: center; }
.item-title { font-size: 9.5px; font-weight: 700; color: #b45309; letter-spacing: 1px; }
.item-value { font-size: 13px; font-weight: 600; color: #27272a; margin-top: 2px; }
.ruby-signatures {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 780px;
  font-family: 'Montserrat', sans-serif;
}
.ruby-sig-block {
  width: 220px;
  text-align: center;
}
.ruby-sig-pen {
  font-family: 'Great Vibes', cursive;
  font-size: 28px;
  color: #500724;
  min-height: 32px;
}
.ruby-sig-bar {
  height: 1px;
  background: #a1a1aa;
  margin: 4px 0 6px;
}
.ruby-sig-label {
  font-size: 12px;
  font-weight: 700;
  color: #18181b;
}
.ruby-sig-co {
  font-size: 10px;
  color: #71717a;
}
.ruby-bottom-id {
  font-size: 10.5px;
  color: #a1a1aa;
  font-family: 'Montserrat', sans-serif;
}
`
  },
  {
    id: "monochrome-obsidian",
    name: "Minimalist Obsidian & Platinum",
    badge: "Modern Scandinavian",
    colors: ["#18181b", "#71717a", "#ffffff"],
    description: "Ultra-clean minimalist monochrome design with geometric divider lines and high-contrast typography.",
    html: `
<div class="cert-container monochrome-obsidian">
  <div class="obsidian-inner">
    <div class="obsidian-header">
      <div class="obsidian-brand">UPTOSKILLS</div>
      <div class="obsidian-badge-code">REF: {{certificateNumber}}</div>
    </div>

    <div class="obsidian-center">
      <div class="obsidian-tag">OFFICIAL CERTIFICATION</div>
      <h1 class="obsidian-title">COMPLETION OF INTERNSHIP</h1>
      <p class="obsidian-label">THIS HONOUR IS AWARDED TO</p>
      
      <div class="obsidian-recipient">
        <h2>{{fullName}}</h2>
      </div>

      <p class="obsidian-statement">
        Having successfully concluded all duties, projects, and benchmarks assigned within the <strong>{{domain}}</strong> domain as <strong>{{internshipRole}}</strong>.
      </p>

      <div class="obsidian-grid">
        <div class="obsidian-cell">
          <span class="cell-k">START DATE</span>
          <span class="cell-v">{{startDate}}</span>
        </div>
        <div class="obsidian-cell">
          <span class="cell-k">END DATE</span>
          <span class="cell-v">{{endDate}}</span>
        </div>
        <div class="obsidian-cell">
          <span class="cell-k">ISSUED</span>
          <span class="cell-v">{{issueDate}}</span>
        </div>
        <div class="obsidian-cell">
          <span class="cell-k">VERIFICATION</span>
          <span class="cell-v">{{verificationCode}}</span>
        </div>
      </div>
    </div>

    <div class="obsidian-footer">
      <div class="obsidian-signatory">
        <div class="obsidian-signature">{{directorName}}</div>
        <div class="obsidian-line"></div>
        <div class="obsidian-role">{{directorTitle}}</div>
      </div>
      <div class="obsidian-signatory text-right">
        <div class="obsidian-signature">Academic Board</div>
        <div class="obsidian-line"></div>
        <div class="obsidian-role">Lead Evaluator</div>
      </div>
    </div>
  </div>
</div>`,
    css: `
* { box-sizing: border-box; }
.cert-container.monochrome-obsidian {
  width: 1123px;
  min-height: 794px;
  padding: 30px;
  background: #18181b;
  color: #18181b;
  font-family: 'Inter', -apple-system, sans-serif;
  margin: 0 auto;
}
.obsidian-inner {
  background: #ffffff;
  padding: 50px 70px;
  min-height: 734px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.obsidian-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #18181b;
  padding-bottom: 16px;
}
.obsidian-brand {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 4px;
  color: #18181b;
}
.obsidian-badge-code {
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  color: #71717a;
}
.obsidian-center {
  text-align: center;
  margin: 20px 0;
}
.obsidian-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #71717a;
}
.obsidian-title {
  margin: 8px 0 16px;
  font-size: 38px;
  font-weight: 900;
  letter-spacing: 1.5px;
  color: #18181b;
}
.obsidian-label {
  font-size: 11px;
  letter-spacing: 2px;
  color: #a1a1aa;
}
.obsidian-recipient h2 {
  margin: 12px 0 16px;
  font-size: 46px;
  font-weight: 800;
  color: #18181b;
  letter-spacing: -0.5px;
}
.obsidian-statement {
  max-width: 780px;
  margin: 0 auto 24px;
  font-size: 15px;
  line-height: 1.6;
  color: #52525b;
}
.obsidian-grid {
  display: flex;
  justify-content: space-between;
  max-width: 820px;
  margin: 0 auto;
  border-top: 1px solid #e4e4e7;
  border-bottom: 1px solid #e4e4e7;
  padding: 12px 16px;
}
.obsidian-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.cell-k { font-size: 9.5px; font-weight: 700; color: #a1a1aa; letter-spacing: 1px; }
.cell-v { font-size: 13px; font-weight: 600; color: #18181b; }
.obsidian-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
}
.obsidian-signatory {
  width: 220px;
}
.obsidian-signatory.text-right {
  text-align: right;
}
.obsidian-signature {
  font-family: 'Great Vibes', cursive;
  font-size: 26px;
  color: #18181b;
  min-height: 32px;
}
.obsidian-line {
  height: 1px;
  background: #18181b;
  margin: 4px 0 6px;
}
.obsidian-role {
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
}
`
  }
];

// Default certificate is the Royal Navy & Gold preset (SS 2)
export const DEFAULT_CERTIFICATE = PRESET_TEMPLATES[0].html;
export const DEFAULT_CERTIFICATE_CSS = PRESET_TEMPLATES[0].css;

// Legacy fallback certificate styling for older database templates
export const LEGACY_CERTIFICATE_CSS = `
  body { margin: 0; background: #e8edf4; }
  .certificate {
    width: 1123px;
    min-height: 794px;
    margin: 0 auto;
    padding: 24px;
    box-sizing: border-box;
    background: #0867d8;
    color: #17365d;
    font-family: Georgia, "Times New Roman", serif;
  }
  .certificate-inner {
    min-height: 746px;
    padding: 54px 72px;
    border: 2px solid #d6ad32;
    background: #fffdf7;
    box-sizing: border-box;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .certificate .brand { color: #0867d8; font-size: 20px; letter-spacing: 5px; font-weight: bold; margin: 0; }
  .certificate .title { margin: 8px 0; font-size: 42px; letter-spacing: 3px; }
  .certificate .subtitle { margin: 0; color: #0867d8; font-size: 24px; }
  .certificate .intro, .certificate .dates, .certificate .verification { margin: 0; font-size: 16px; }
  .certificate .intern-name { margin: 8px 0; color: #0867d8; font-size: 36px; font-weight: bold; }
  .certificate .domain { margin: 0; font-size: 20px; }
  .certificate .signature { width: 220px; margin-top: 28px; padding-top: 8px; border-top: 1px solid #9ca3af; font-size: 14px; }
  .certificate .details { display: flex; justify-content: space-between; gap: 24px; width: 100%; margin-top: 18px; font-size: 13px; }
  .certificate .detail-block { text-align: left; }
  .certificate .detail-block.right { text-align: right; }
  .certificate .detail-label { margin-bottom: 4px; font-weight: bold; }
`;

// ============================================================================
// EXPANDED DRAGGABLE DESIGN BLOCKS
// ============================================================================
export const BLOCKS = [
  // --- Typography & Headings ---
  {
    id: "cert-title",
    label: "Main Title",
    category: "Typography",
    content: `<h1 style="text-align:center;font-size:38px;letter-spacing:4px;color:#081a36;font-family:'Cinzel',Georgia,serif;margin:12px 0;">CERTIFICATE OF COMPLETION</h1>`,
  },
  {
    id: "recipient-name",
    label: "Recipient Name",
    category: "Typography",
    content: `<h2 style="text-align:center;font-size:40px;color:#081a36;font-family:'Playfair Display',serif;font-weight:700;margin:10px 0;border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:6px;">{{fullName}}</h2>`,
  },
  {
    id: "cert-body-citation",
    label: "Citation Body Text",
    category: "Typography",
    content: `<p style="text-align:center;font-size:15px;line-height:1.7;color:#334155;max-width:800px;margin:12px auto;font-family:'Montserrat',sans-serif;">This certificate is proudly awarded to <strong>{{fullName}}</strong> for successfully fulfilling all program requirements in <strong>{{domain}}</strong> with dedication and excellence.</p>`,
  },
  {
    id: "appreciation-quote",
    label: "Quote / Motto",
    category: "Typography",
    content: `<p style="text-align:center;font-style:italic;font-size:14px;color:#64748b;font-family:'Playfair Display',serif;margin:8px auto;">"In recognition of outstanding dedication, creative problem-solving, and exemplary leadership."</p>`,
  },

  // --- Badges & Seals ---
  {
    id: "gold-seal-badge",
    label: "Gold Medal Seal",
    category: "Badges & Seals",
    content: `
      <div style="display:flex;justify-content:center;margin:14px 0;">
        <div style="width:68px;height:68px;border-radius:50%;background:radial-gradient(circle,#fde047,#ca8a04);display:flex;align-items:center;justify-content:center;border:3px double #fef08a;box-shadow:0 4px 12px rgba(161,98,7,0.35);color:#713f12;font-family:'Montserrat',sans-serif;text-align:center;font-weight:800;font-size:8px;line-height:1.2;">
          <div>★<br>OFFICIAL<br>2026</div>
        </div>
      </div>`,
  },
  {
    id: "verified-credential-pill",
    label: "Verified Credential Pill",
    category: "Badges & Seals",
    content: `
      <div style="display:flex;justify-content:center;margin:8px 0;">
        <span style="display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#059669;border:1px solid #10b981;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:1px;padding:5px 14px;font-family:'Montserrat',sans-serif;">
          ✓ VERIFIED CREDENTIAL
        </span>
      </div>`,
  },
  {
    id: "honors-ribbon",
    label: "Honors Ribbon",
    category: "Badges & Seals",
    content: `
      <div style="display:flex;justify-content:center;margin:8px 0;">
        <span style="background:#831843;color:#fef08a;border:1px solid #d97706;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:2px;padding:4px 18px;font-family:'Montserrat',sans-serif;">
          ★ WITH DISTINCTION ★
        </span>
      </div>`,
  },

  // --- Signatures & Authorities ---
  {
    id: "dual-signatures",
    label: "Dual Signatures",
    category: "Signatures",
    content: `
      <div style="display:flex;justify-content:space-between;width:100%;max-width:800px;margin:24px auto 8px;font-family:'Montserrat',sans-serif;">
        <div style="width:220px;text-align:center;">
          <div style="font-family:'Great Vibes',cursive;font-size:28px;color:#081a36;">{{directorName}}</div>
          <div style="height:1px;background:#94a3b8;margin:4px 0 6px;"></div>
          <div style="font-size:13px;font-weight:700;color:#081a36;">{{directorName}}</div>
          <div style="font-size:11px;color:#64748b;">{{directorTitle}}</div>
        </div>
        <div style="width:220px;text-align:center;">
          <div style="font-family:'Great Vibes',cursive;font-size:28px;color:#081a36;">Academic Lead</div>
          <div style="height:1px;background:#94a3b8;margin:4px 0 6px;"></div>
          <div style="font-size:13px;font-weight:700;color:#081a36;">Academic Dean</div>
          <div style="font-size:11px;color:#64748b;">Faculty of Engineering</div>
        </div>
      </div>`,
  },
  {
    id: "single-signature",
    label: "Single Signature",
    category: "Signatures",
    content: `
      <div style="width:220px;margin:20px auto 8px;text-align:center;font-family:'Montserrat',sans-serif;">
        <div style="font-family:'Great Vibes',cursive;font-size:28px;color:#081a36;">{{directorName}}</div>
        <div style="height:1px;background:#94a3b8;margin:4px 0 6px;"></div>
        <div style="font-size:13px;font-weight:700;color:#081a36;">{{directorName}}</div>
        <div style="font-size:11px;color:#64748b;">Authorized Signatory</div>
      </div>`,
  },

  // --- Verification & Metadata ---
  {
    id: "qr-verification-block",
    label: "QR Code Verification Box",
    category: "Verification",
    content: `
      <div style="display:inline-flex;align-items:center;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;font-family:'Montserrat',sans-serif;">
        <div style="width:48px;height:48px;background:#ffffff;border:1px dashed #94a3b8;display:flex;align-items:center;justify-content:center;font-size:9px;color:#64748b;font-weight:bold;border-radius:4px;">QR</div>
        <div style="text-align:left;font-size:11px;color:#475569;line-height:1.4;">
          Scan to Verify Authenticity<br>
          Code: <strong>{{verificationCode}}</strong>
        </div>
      </div>`,
  },
  {
    id: "metadata-grid",
    label: "Metadata Info Strip",
    category: "Verification",
    content: `
      <div style="display:flex;justify-content:space-around;width:100%;max-width:760px;margin:14px auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;font-family:'Montserrat',sans-serif;">
        <div style="text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;">CERTIFICATE ID</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">{{certificateNumber}}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;">ISSUE DATE</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">{{issueDate}}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;">VERIFICATION REF</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">{{verificationCode}}</div>
        </div>
      </div>`,
  },

  // --- Decorative Elements ---
  {
    id: "gold-divider-ornament",
    label: "Gold Divider Line",
    category: "Decorations",
    content: `
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:14px auto;max-width:320px;">
        <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,#d4af37);"></div>
        <span style="color:#d4af37;font-size:14px;">✦</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,#d4af37,transparent);"></div>
      </div>`,
  },
];

// ============================================================================
// COMPREHENSIVE PLACEHOLDER TOKENS
// ============================================================================
export const PLACEHOLDERS = [
  {
    token: "{{fullName}}",
    description: "Intern full name",
    example: "Aditya Sharma",
    category: "candidate",
  },
  {
    token: "{{internCode}}",
    description: "Intern unique code",
    example: "INT-2026-0042",
    category: "candidate",
  },
  {
    token: "{{domain}}",
    description: "Internship domain / department",
    example: "Full Stack Web Development",
    category: "internship",
  },
  {
    token: "{{internshipRole}}",
    description: "Role / title held during internship",
    example: "Full Stack Developer Intern",
    category: "internship",
  },
  {
    token: "{{startDate}}",
    description: "Internship start date",
    example: "12 Jan 2026",
    category: "internship",
  },
  {
    token: "{{endDate}}",
    description: "Internship end date",
    example: "12 Jul 2026",
    category: "internship",
  },
  {
    token: "{{issueDate}}",
    description: "Certificate issue date",
    example: "15 Jul 2026",
    category: "certificate",
  },
  {
    token: "{{certificateNumber}}",
    description: "Unique certificate identification",
    example: "UPTO-2026-8812",
    category: "certificate",
  },
  {
    token: "{{verificationCode}}",
    description: "Security verification code",
    example: "VRF-8812-OK",
    category: "certificate",
  },
  {
    token: "{{certificateTitle}}",
    description: "Certificate title label",
    example: "Certificate of Internship Completion",
    category: "certificate",
  },
  {
    token: "{{organizationName}}",
    description: "Issuing organization title",
    example: "UPTOSKILLS",
    category: "organization",
  },
  {
    token: "{{directorName}}",
    description: "Program Director / Authorized Signatory",
    example: "Dr. Rajesh Kumar",
    category: "organization",
  },
  {
    token: "{{directorTitle}}",
    description: "Title of Authorized Signatory",
    example: "Director & Head of Programs",
    category: "organization",
  },
  {
    token: "{{requestNumber}}",
    description: "Certificate request reference",
    example: "REQ-2026-0819",
    category: "certificate",
  },
];

// Helper to separate HTML body and embedded CSS from a full document
export const splitTemplateDocument = (source) => {
  if (typeof DOMParser === "undefined") {
    return { html: source || "", css: "" };
  }

  const parsed = new DOMParser().parseFromString(source || "", "text/html");
  const styles = Array.from(parsed.querySelectorAll("style"));
  const css = styles
    .map((style) => style.textContent || "")
    .filter(Boolean)
    .join("\n");
  styles.forEach((style) => style.remove());
  parsed.body
    ?.querySelectorAll("meta, title, link")
    .forEach((node) => node.remove());

  const html = parsed.body?.innerHTML || source || "";
  return { html, css };
};

// Helper to build a complete HTML document with embedded CSS
export const buildTemplateDocument = (html, css) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Great+Vibes&family=Inter:wght@400;600;700;800&family=Montserrat:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 0;
      }
      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .cert-container {
        margin: 0 auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    ${css || ""}
  </style>
</head>
<body>
${html || ""}
</body>
</html>`;

// The Royal Navy & Gold (SS 2) certificate document
export const DEFAULT_CERTIFICATE_DOCUMENT = buildTemplateDocument(
  DEFAULT_CERTIFICATE,
  DEFAULT_CERTIFICATE_CSS
);

// Fallback preset template generator for every Certificate Type
export const getTemplateForCertificateType = (type) => {
  switch (type) {
    case "completion_certificate":
      return buildTemplateDocument(PRESET_TEMPLATES[0].html, PRESET_TEMPLATES[0].css);
    case "intern_of_month":
      return buildTemplateDocument(PRESET_TEMPLATES[2].html, PRESET_TEMPLATES[2].css);
    case "custom":
      return buildTemplateDocument(PRESET_TEMPLATES[1].html, PRESET_TEMPLATES[1].css);
    case "league_winner":
      return buildTemplateDocument(
        PRESET_TEMPLATES[0].html
          .replace("CERTIFICATE OF COMPLETION", "LEAGUE WINNER CERTIFICATE")
          .replace("In recognition of successful completion and outstanding performance in the intensive <strong>{{domain}}</strong> program as <strong>{{internshipRole}}</strong>. Having fulfilled all rigorous practical and professional requirements with distinction.",
            "In recognition of triumphant achievement, outstanding teamwork, and winning performance in the <strong>{{domain}}</strong> competition league."),
        PRESET_TEMPLATES[0].css
      );
    case "bonafide":
      return buildTemplateDocument(
        PRESET_TEMPLATES[0].html
          .replace("CERTIFICATE OF COMPLETION", "BONAFIDE CERTIFICATE")
          .replace("In recognition of successful completion and outstanding performance in the intensive <strong>{{domain}}</strong> program as <strong>{{internshipRole}}</strong>. Having fulfilled all rigorous practical and professional requirements with distinction.",
            "This is to officially certify that <strong>{{fullName}}</strong> is a bonafide student and registered intern in <strong>{{domain}}</strong>. This credential is validly issued for academic and institutional verification purposes."),
        PRESET_TEMPLATES[0].css
      );
    case "ojt_certificate":
      return buildTemplateDocument(
        PRESET_TEMPLATES[0].html
          .replace("CERTIFICATE OF COMPLETION", "ON-THE-JOB TRAINING (OJT)")
          .replace("In recognition of successful completion and outstanding performance in the intensive <strong>{{domain}}</strong> program as <strong>{{internshipRole}}</strong>. Having fulfilled all rigorous practical and professional requirements with distinction.",
            "In recognition of successful completion of the rigorous practical On-the-Job Training (OJT) curriculum in <strong>{{domain}}</strong> as <strong>{{internshipRole}}</strong>, demonstrating exceptional technical competency and applied skill."),
        PRESET_TEMPLATES[0].css
      );
    case "offer_letter":
      return buildTemplateDocument(
        PRESET_TEMPLATES[0].html
          .replace("CERTIFICATE OF COMPLETION", "INTERNSHIP OFFER LETTER")
          .replace("THIS IS PROUDLY PRESENTED TO", "OFFICIALLY CONFERRED TO")
          .replace("In recognition of successful completion and outstanding performance in the intensive <strong>{{domain}}</strong> program as <strong>{{internshipRole}}</strong>. Having fulfilled all rigorous practical and professional requirements with distinction.",
            "We are pleased to offer <strong>{{fullName}}</strong> the position of <strong>{{internshipRole}}</strong> in the <strong>{{domain}}</strong> division. Welcome to the UPTOSKILLS experiential learning program."),
        PRESET_TEMPLATES[0].css
      );
    case "experience_letter":
    case "experience_letter_detailed":
      return buildTemplateDocument(
        PRESET_TEMPLATES[0].html
          .replace("CERTIFICATE OF COMPLETION", "EXPERIENCE LETTER")
          .replace("In recognition of successful completion and outstanding performance in the intensive <strong>{{domain}}</strong> program as <strong>{{internshipRole}}</strong>. Having fulfilled all rigorous practical and professional requirements with distinction.",
            "This is to certify that <strong>{{fullName}}</strong> has worked with UPTOSKILLS as <strong>{{internshipRole}}</strong> in the <strong>{{domain}}</strong> division. During the tenure, performance and conduct were found to be exemplary."),
        PRESET_TEMPLATES[0].css
      );
    default:
      return DEFAULT_CERTIFICATE_DOCUMENT;
  }
};
