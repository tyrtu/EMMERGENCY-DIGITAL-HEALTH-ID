import express from 'express';
import { generateAcademicDocPDF } from '../services/academicDocPdfGenerator.js';

const router = express.Router();

/**
 * GET /api/academic-doc/pdf
 * Generate and download academic documentation PDF
 */
router.get('/pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateAcademicDocPDF();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Emergency_Digital_Health_ID_Academic_Documentation.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating academic documentation PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      message: error.message 
    });
  }
});

export default router;

