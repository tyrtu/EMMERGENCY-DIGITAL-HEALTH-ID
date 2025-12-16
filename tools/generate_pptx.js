const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const mdPath = path.join(__dirname, '..', 'PRESENTATION_SLIDES.md');
if (!fs.existsSync(mdPath)) {
  console.error('PRESENTATION_SLIDES.md not found');
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');
// Split slides on lines that contain only '---'
const slides = md.split(/\n---\n/);

const pptx = new PptxGenJS();

slides.forEach((block, idx) => {
  const lines = block.split('\n').map(l => l.replace(/\r$/, ''));
  // Find first heading line (one or more #) to use as title
  let titleLineIndex = lines.findIndex(l => /^#{1,3}\s+/.test(l));
  let title = titleLineIndex !== -1 ? lines[titleLineIndex].replace(/^#{1,3}\s+/, '') : `Slide ${idx+1}`;

  // Build body from remaining lines excluding leading headings
  const bodyLines = lines.filter((l, i) => i !== titleLineIndex && !/^#{1,3}\s+/.test(l));
  const body = bodyLines.join('\n').trim();

  const slide = pptx.addSlide();
  slide.addText(title, { x: 0.5, y: 0.4, fontSize: 28, bold: true, color: '363636' });
  if (body) {
    // Limit font size and use wrapping
    slide.addText(body, { x: 0.5, y: 1.2, w: 9, h: 5.0, fontSize: 14, color: '333333', wrap: true });
  }
});

const outName = 'Emergency_Health_ID_Presentation.pptx';
(async () => {
  try {
    await pptx.writeFile({ fileName: outName });
    console.log('Created PPTX:', outName);
  } catch (err) {
    console.error('Failed to create PPTX:', err);
    process.exit(1);
  }
})();
