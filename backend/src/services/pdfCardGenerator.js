import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Health ID Card PDF with CR80 standard dimensions
 * @param {Object} patientData - Patient data object
 * @param {Buffer} qrCodeBuffer - QR code image buffer
 * @param {Buffer|null} profilePhotoBuffer - Profile photo buffer (optional)
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateHealthIDCardPDF(patientData, qrCodeBuffer, profilePhotoBuffer = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // CR80 Standard: 85.6mm x 53.98mm
      // Convert to points (1mm = 2.83465 points for 300 DPI)
      const CARD_WIDTH_MM = 85.6;
      const CARD_HEIGHT_MM = 53.98;
      const BLEED_MM = 3;
      const SAFE_MARGIN_MM = 2;
      
      // For 300 DPI: 1mm = 11.811 points (300/25.4)
      const MM_TO_POINTS = 11.811;
      const CARD_WIDTH = CARD_WIDTH_MM * MM_TO_POINTS;
      const CARD_HEIGHT = CARD_HEIGHT_MM * MM_TO_POINTS;
      const BLEED = BLEED_MM * MM_TO_POINTS;
      const SAFE_MARGIN = SAFE_MARGIN_MM * MM_TO_POINTS;
      
      // Total page size with bleed
      const PAGE_WIDTH = CARD_WIDTH + (BLEED * 2);
      const PAGE_HEIGHT = CARD_HEIGHT + (BLEED * 2);
      
      // Create PDF document with high quality settings
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 0,
        compress: false, // Disable compression for better quality
        info: {
          Title: 'Emergency Digital Health ID Card',
          Author: 'Emergency Medical Health System',
          Subject: 'Health ID Card',
          Creator: 'Emergency Health ID System'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Extract patient data with proper sanitization
      const healthId = (patientData.healthId || patientData.authId?.slice(0, 8) || 'N/A').toString().trim();
      const fullName = (patientData.basicInfo?.fullName || 'Unknown').toString().trim();
      const bloodGroup = (patientData.basicInfo?.bloodGroup || 'Unknown').toString().trim();
      // Sanitize gender - ensure it's a valid value
      let gender = (patientData.basicInfo?.gender || 'N/A').toString().trim();
      // Validate gender value
      if (!['Male', 'Female', 'Other', 'N/A'].includes(gender)) {
        gender = 'N/A';
      }
      const dob = patientData.basicInfo?.dob 
        ? new Date(patientData.basicInfo.dob).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'Not Provided';
      
      const issueDate = new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });

      // ============================================
      // FRONT SIDE
      // ============================================
      

      // THEME COLORS (match Tailwind config)
      const COLOR_PRIMARY = '#2563eb'; // Tailwind blue-600 (primary)
      const COLOR_PRIMARY_DARK = '#1e40af'; // Tailwind blue-800 (primary-dark)
      const COLOR_ACCENT = '#0ea5e9'; // Tailwind sky-500 (accent)
      const COLOR_FOREGROUND = '#0f172a'; // Tailwind slate-900 (foreground)
      const COLOR_CARD_BG = '#ffffff'; // white
      const COLOR_BORDER = '#e5e7eb'; // Tailwind gray-200

      // Professional card border - double border for official look
      // Outer border
      doc.rect(BLEED, BLEED, CARD_WIDTH, CARD_HEIGHT)
        .lineWidth(2 * MM_TO_POINTS)
        .strokeColor(COLOR_PRIMARY_DARK)
        .stroke();

      // Inner border for professional appearance
      const innerBorderOffset = 1 * MM_TO_POINTS;
      doc.rect(BLEED + innerBorderOffset, BLEED + innerBorderOffset,
            CARD_WIDTH - (innerBorderOffset * 2), CARD_HEIGHT - (innerBorderOffset * 2))
        .lineWidth(0.5 * MM_TO_POINTS)
        .strokeColor(COLOR_PRIMARY)
        .stroke();

      // Background (white) - inside border
      doc.rect(BLEED, BLEED, CARD_WIDTH, CARD_HEIGHT)
        .fillColor(COLOR_CARD_BG)
        .fill();

      // Professional header bar with subtle depth
      const headerHeight = 12 * MM_TO_POINTS;
      doc.rect(BLEED, BLEED, CARD_WIDTH, headerHeight)
        .fillColor(COLOR_PRIMARY)
        .fill();

      // Subtle top highlight for professional depth
      doc.rect(BLEED, BLEED, CARD_WIDTH, 0.5 * MM_TO_POINTS)
        .fillColor(COLOR_ACCENT)
        .fill();

      // Header content
      const headerY = BLEED + (headerHeight / 2);
      
      // Professional medical icon - circular badge with cross
      const iconSize = 8 * MM_TO_POINTS;
      const iconX = BLEED + 3 * MM_TO_POINTS;
      const iconY = BLEED + 2 * MM_TO_POINTS;
      const iconCenterX = iconX + (iconSize / 2);
      const iconCenterY = iconY + (iconSize / 2);
      

      // White circular background
      doc.circle(iconCenterX, iconCenterY, iconSize / 2)
        .fillColor(COLOR_CARD_BG)
        .fill();

      // Primary border circle
      doc.circle(iconCenterX, iconCenterY, iconSize / 2)
        .lineWidth(0.5 * MM_TO_POINTS)
        .strokeColor(COLOR_PRIMARY)
        .stroke();

      // Medical cross - professional styling
      const iconCrossThickness = 1 * MM_TO_POINTS;
      const iconCrossLength = iconSize * 0.6;
      doc.rect(iconCenterX - (iconCrossThickness / 2), iconCenterY - (iconCrossLength / 2),
            iconCrossThickness, iconCrossLength)
        .fillColor(COLOR_PRIMARY)
        .fill();
      doc.rect(iconCenterX - (iconCrossLength / 2), iconCenterY - (iconCrossThickness / 2),
            iconCrossLength, iconCrossThickness)
        .fillColor(COLOR_PRIMARY)
        .fill();

      // Title text - adjusted font size and position to fit properly, prevent cutoff
      doc.opacity(1)
         .fontSize(3.5 * MM_TO_POINTS)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('EMERGENCY DIGITAL HEALTH ID', BLEED + 12 * MM_TO_POINTS, BLEED + 3.5 * MM_TO_POINTS, {
           width: CARD_WIDTH - 35 * MM_TO_POINTS, // Space for icon and badge
           align: 'center',
           lineGap: 0.3 * MM_TO_POINTS
         });

      // Professional Health ID badge (top right) - official badge design
      const badgeWidth = 26 * MM_TO_POINTS;
      const badgeHeight = 8 * MM_TO_POINTS;
      const badgeX = BLEED + CARD_WIDTH - badgeWidth - 2.5 * MM_TO_POINTS;
      const badgeY = BLEED + 2 * MM_TO_POINTS;
      
      // White background with subtle shadow effect
      doc.rect(badgeX, badgeY, badgeWidth, badgeHeight)
        .fillColor(COLOR_CARD_BG)
        .fill();

      // Professional border - double line effect
      doc.rect(badgeX, badgeY, badgeWidth, badgeHeight)
        .lineWidth(0.8 * MM_TO_POINTS)
        .strokeColor(COLOR_PRIMARY)
        .stroke();

      // Inner border for depth
      doc.rect(badgeX + 0.3 * MM_TO_POINTS, badgeY + 0.3 * MM_TO_POINTS,
            badgeWidth - 0.6 * MM_TO_POINTS, badgeHeight - 0.6 * MM_TO_POINTS)
        .lineWidth(0.3 * MM_TO_POINTS)
        .strokeColor(COLOR_ACCENT)
        .stroke();

      // Badge label
      doc.fontSize(1.8 * MM_TO_POINTS)
        .fillColor(COLOR_PRIMARY)
        .font('Helvetica-Bold')
        .text('HEALTH ID', badgeX, badgeY + 0.7 * MM_TO_POINTS, {
          width: badgeWidth,
          align: 'center'
        });

      // Badge value - more prominent
      doc.fontSize(2.8 * MM_TO_POINTS)
        .fillColor(COLOR_PRIMARY_DARK)
        .font('Helvetica-Bold')
        .text(healthId, badgeX, badgeY + 3.2 * MM_TO_POINTS, {
          width: badgeWidth,
          align: 'center',
          ellipsis: true
        });

      // Main content area - with safe margin from header
      const contentStartY = BLEED + headerHeight + 2.5 * MM_TO_POINTS;
      
      // Profile photo
      const photoWidth = 15 * MM_TO_POINTS;
      const photoHeight = 20 * MM_TO_POINTS;
      const photoX = BLEED + 5 * MM_TO_POINTS;
      const photoY = contentStartY;
      
      if (profilePhotoBuffer) {
        try {
          // Process photo: resize and crop to fit with high quality settings
          const processedPhoto = await sharp(profilePhotoBuffer)
            .resize(Math.round(photoWidth), Math.round(photoHeight), {
              fit: 'cover',
              position: 'center',
              kernel: sharp.kernel.lanczos3 // High quality resampling
            })
            .sharpen() // Enhance sharpness to reduce blur
            .normalize() // Normalize brightness/contrast
            .jpeg({ 
              quality: 100, // Maximum quality
              mozjpeg: true // Use mozjpeg for better quality
            })
            .toBuffer();
          
          // Ensure image is rendered with high quality
          doc.image(processedPhoto, photoX, photoY, {
            width: photoWidth,
            height: photoHeight,
            fit: [photoWidth, photoHeight],
            align: 'center',
            valign: 'center'
          });
        } catch (photoError) {
          console.error('Error processing profile photo:', photoError);
          // Fall through to placeholder
        }
      }
      
      // Professional photo border - double border for official look
      // Outer border
      doc.rect(photoX, photoY, photoWidth, photoHeight)
         .lineWidth(1.5 * MM_TO_POINTS)
         .strokeColor('#dc2626')
         .stroke();
      
      // Inner border for depth
      doc.rect(photoX + 0.5 * MM_TO_POINTS, photoY + 0.5 * MM_TO_POINTS, 
               photoWidth - 1 * MM_TO_POINTS, photoHeight - 1 * MM_TO_POINTS)
         .lineWidth(0.5 * MM_TO_POINTS)
         .strokeColor('#ffffff')
         .stroke();

      // Information section (right of photo) - stacked vertically
      const infoX = photoX + photoWidth + 3.5 * MM_TO_POINTS;
      const infoY = photoY;
      const infoWidth = 35 * MM_TO_POINTS; // Fixed width for info section
      let currentY = infoY;

      // Full Name - clean consistent styling like back card
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('FULL NAME:', infoX, currentY, {
           width: infoWidth
         });
      
      currentY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text(fullName, infoX, currentY, {
           width: infoWidth,
           ellipsis: true
         });
      
      currentY += 3.2 * MM_TO_POINTS; // Consistent spacing like back card
      
      // Blood Type - clean consistent styling
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('BLOOD TYPE:', infoX, currentY, {
           width: infoWidth
         });
      
      currentY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text(bloodGroup, infoX, currentY, {
           width: infoWidth
         });
      
      currentY += 3.2 * MM_TO_POINTS;
      
      // Date of Birth - clean consistent styling
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('DATE OF BIRTH:', infoX, currentY, {
           width: infoWidth
         });
      
      currentY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#111827')
         .font('Helvetica-Bold')
         .text(dob, infoX, currentY, {
           width: infoWidth,
           ellipsis: true
         });
      
      currentY += 3.2 * MM_TO_POINTS;
      
      // Gender - clean consistent styling
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('GENDER:', infoX, currentY, {
           width: infoWidth
         });
      
      currentY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#111827')
         .font('Helvetica-Bold')
         .text(gender, infoX, currentY, {
           width: infoWidth,
           ellipsis: true
         });

      // Logo/Icon area on the right side to fill empty space
      const logoX = infoX + infoWidth + 2 * MM_TO_POINTS;
      const logoY = infoY;
      const logoWidth = CARD_WIDTH - logoX - BLEED - 3 * MM_TO_POINTS;
      const logoHeight = photoHeight; // Match photo height
      
      // Draw a medical cross logo/icon
      const logoCenterX = logoX + (logoWidth / 2);
      const logoCenterY = logoY + (logoHeight / 2);
      const logoCrossSize = Math.min(logoWidth, logoHeight) * 0.4; // 40% of available space
      const logoCrossThickness = logoCrossSize * 0.15;
      
      // Professional medical logo - enhanced design
      const logoRadius = logoCrossSize / 2;
      
      // Outer circle with gradient effect (simulated with lighter fill)
      doc.circle(logoCenterX, logoCenterY, logoRadius)
         .fillColor('#fef2f2')
         .fill();
      
      // Main border circle
      doc.circle(logoCenterX, logoCenterY, logoRadius)
         .lineWidth(1.2 * MM_TO_POINTS)
         .strokeColor('#dc2626')
         .stroke();
      
      // Inner circle for depth
      doc.circle(logoCenterX, logoCenterY, logoRadius - 1 * MM_TO_POINTS)
         .lineWidth(0.4 * MM_TO_POINTS)
         .strokeColor('#fca5a5')
         .stroke();
      
      // Professional medical cross
      const logoCrossThicknessFinal = logoCrossThickness;
      const logoCrossLengthFinal = logoCrossSize * 0.7;
      doc.rect(logoCenterX - (logoCrossThicknessFinal / 2), logoCenterY - (logoCrossLengthFinal / 2), 
               logoCrossThicknessFinal, logoCrossLengthFinal)
         .fillColor('#dc2626')
         .fill();
      doc.rect(logoCenterX - (logoCrossLengthFinal / 2), logoCenterY - (logoCrossThicknessFinal / 2), 
               logoCrossLengthFinal, logoCrossThicknessFinal)
         .fillColor('#dc2626')
         .fill();
      
      // Professional text below logo
      const logoTextY = logoY + logoHeight - 2.5 * MM_TO_POINTS;
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text('EMERGENCY', logoX, logoTextY, {
           width: logoWidth,
           align: 'center'
         });

      // Footer section - ensure it doesn't overlap with content above
      // Calculate based on content end position (Gender is now the last item)
      const contentEndY = currentY + 3 * MM_TO_POINTS; // End of Gender + margin
      const footerHeight = 7 * MM_TO_POINTS;
      const footerY = Math.max(
        contentEndY + 2 * MM_TO_POINTS, // At least 2mm after content
        BLEED + CARD_HEIGHT - footerHeight - 2 * MM_TO_POINTS // Or near bottom with margin
      );
      
      // Professional divider line - double line for official appearance
      const dividerY = footerY - 1.5 * MM_TO_POINTS;
      // Main divider line
      doc.moveTo(BLEED + 5 * MM_TO_POINTS, dividerY)
         .lineTo(BLEED + CARD_WIDTH - 5 * MM_TO_POINTS, dividerY)
         .lineWidth(0.8 * MM_TO_POINTS)
         .strokeColor('#dc2626')
         .stroke();
      
      // Subtle secondary line for depth
      doc.moveTo(BLEED + 5 * MM_TO_POINTS, dividerY + 0.3 * MM_TO_POINTS)
         .lineTo(BLEED + CARD_WIDTH - 5 * MM_TO_POINTS, dividerY + 0.3 * MM_TO_POINTS)
         .lineWidth(0.3 * MM_TO_POINTS)
         .strokeColor('#fca5a5')
         .stroke();

      // Patient ID - clean consistent styling
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('PATIENT ID:', BLEED + 5 * MM_TO_POINTS, footerY, {
           width: 22 * MM_TO_POINTS
         });
      
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#111827')
         .font('Helvetica-Bold')
         .text(healthId, BLEED + 5 * MM_TO_POINTS, footerY + 2.5 * MM_TO_POINTS, {
           width: 30 * MM_TO_POINTS
         });

      // Issuer info (right side of footer) - clean consistent styling
      const issuerX = BLEED + 36 * MM_TO_POINTS; // Start after Patient ID
      const issuerWidth = CARD_WIDTH - 41 * MM_TO_POINTS; // Leave margin on right
      
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#374151')
         .font('Helvetica-Bold')
         .text('Issued by Emergency Medical Health System', issuerX, footerY, {
           width: issuerWidth,
           align: 'right',
           ellipsis: true
         });
      
      doc.fontSize(1.8 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica')
         .text('This is an official medical identification card', issuerX, footerY + 2.5 * MM_TO_POINTS, {
           width: issuerWidth,
           align: 'right',
           ellipsis: true
         });

      // ============================================
      // BACK SIDE
      // ============================================
      
      // Add new page for back side
      doc.addPage({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 0
      });

      // Professional card border - double border for official look (matches front)
      // Outer border
      doc.rect(BLEED, BLEED, CARD_WIDTH, CARD_HEIGHT)
         .lineWidth(2 * MM_TO_POINTS)
         .strokeColor('#000000')
         .stroke();
      
      // Inner border for professional appearance
      const backInnerBorderOffset = 1 * MM_TO_POINTS;
      doc.rect(BLEED + backInnerBorderOffset, BLEED + backInnerBorderOffset, 
               CARD_WIDTH - (backInnerBorderOffset * 2), CARD_HEIGHT - (backInnerBorderOffset * 2))
         .lineWidth(0.5 * MM_TO_POINTS)
         .strokeColor('#dc2626')
         .stroke();
      
      // Background (white) - inside border
      doc.rect(BLEED, BLEED, CARD_WIDTH, CARD_HEIGHT)
         .fillColor('white')
         .fill();

      // Back header - solid color, no gradient
      doc.rect(BLEED, BLEED, CARD_WIDTH, headerHeight)
         .fillColor('#dc2626')
         .fill();

      // "NOTICE" text - properly positioned
      doc.fontSize(5 * MM_TO_POINTS)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('NOTICE', BLEED, BLEED + 3.5 * MM_TO_POINTS, {
           width: CARD_WIDTH,
           align: 'center'
         });

      // Instructions text (below header) - increased spacing from header
      const instructionsY = BLEED + headerHeight + 3 * MM_TO_POINTS; // More space from header
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#374151')
         .font('Helvetica')
         .text('In case of emergency, medical information can be accessed by scanning the QR code on this card. Keep this card with you at all times.', 
               BLEED + 5 * MM_TO_POINTS, instructionsY, {
                 width: CARD_WIDTH - 10 * MM_TO_POINTS,
                 align: 'left',
                 lineGap: 1.2 * MM_TO_POINTS
               });

      // Calculate instructions text height and position content below it
      const instructionsHeight = 6 * MM_TO_POINTS; // Approximate height for 2 lines
      const backContentStartY = instructionsY + instructionsHeight + 2 * MM_TO_POINTS; // Space after instructions
      
      // Layout: Details on left, QR code on right (side by side)
      const detailsLeftX = BLEED + 5 * MM_TO_POINTS;
      const detailsWidth = 35 * MM_TO_POINTS; // Fixed width for details section
      const qrSize = 20 * MM_TO_POINTS; // QR code size
      const qrX = BLEED + CARD_WIDTH - qrSize - 5 * MM_TO_POINTS; // Right side
      const qrY = backContentStartY; // Align with details start

      if (qrCodeBuffer && qrCodeBuffer.length > 0) {
        try {
          // Process QR code - ensure pure black and white, no overlay
          const processedQR = await sharp(qrCodeBuffer)
            .resize(Math.round(qrSize), Math.round(qrSize), {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255 }
            })
            .greyscale() // Convert to greyscale for better contrast
            .normalize() // Normalize contrast
            .threshold(128) // Ensure pure black/white
            .png({ quality: 100, compressionLevel: 0 }) // High quality
            .toBuffer();
          
          if (processedQR && processedQR.length > 0) {
            // Draw white background first
            doc.rect(qrX, qrY, qrSize, qrSize)
               .fillColor('white')
               .fill();
            
            // Draw QR code image
            doc.image(processedQR, qrX, qrY, {
              width: qrSize,
              height: qrSize,
              fit: [qrSize, qrSize]
            });
          } else {
            console.error('QR code processing resulted in empty buffer');
          }
        } catch (qrError) {
          console.error('Error processing QR code:', qrError);
          // Draw placeholder if QR fails
          doc.rect(qrX, qrY, qrSize, qrSize)
             .fillColor('#f3f4f6')
             .fill();
          doc.fontSize(3 * MM_TO_POINTS)
             .fillColor('#9ca3af')
             .font('Helvetica')
             .text('QR Code\nUnavailable', qrX, qrY + qrSize / 2 - 3 * MM_TO_POINTS, {
               width: qrSize,
               align: 'center'
             });
        }
      } else {
        console.warn('QR code buffer is empty or missing');
        // Draw placeholder
        doc.rect(qrX, qrY, qrSize, qrSize)
           .fillColor('#f3f4f6')
           .fill();
        doc.fontSize(3 * MM_TO_POINTS)
           .fillColor('#9ca3af')
           .font('Helvetica')
           .text('QR Code\nUnavailable', qrX, qrY + qrSize / 2 - 3 * MM_TO_POINTS, {
             width: qrSize,
             align: 'center'
           });
      }

      // QR border - thin border AFTER QR code, not overlaying it
      doc.rect(qrX, qrY, qrSize, qrSize)
         .lineWidth(0.5 * MM_TO_POINTS)
         .strokeColor('#000000')
         .stroke();

      // Card details section (left side, next to QR) - organized single column layout
      const detailsY = backContentStartY;
      
      // Calculate available space - leave room for security notice at bottom
      const securityHeight = 5.5 * MM_TO_POINTS;
      const securityMargin = 1 * MM_TO_POINTS;
      const detailLineHeight = 3.2 * MM_TO_POINTS;
      
      let detailY = detailsY;

      // Health ID
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('Health ID:', detailsLeftX, detailY, {
           width: detailsWidth
         });
      
      detailY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text(healthId, detailsLeftX, detailY, {
           width: detailsWidth,
           ellipsis: true
         });
      
      detailY += detailLineHeight;

      // Full Name
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('Full Name:', detailsLeftX, detailY, {
           width: detailsWidth
         });
      
      detailY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text(fullName, detailsLeftX, detailY, {
           width: detailsWidth,
           ellipsis: true
         });
      
      detailY += detailLineHeight;

      // Issue Date
      doc.fontSize(2 * MM_TO_POINTS)
         .fillColor('#6b7280')
         .font('Helvetica-Bold')
         .text('Issue Date:', detailsLeftX, detailY, {
           width: detailsWidth
         });
      
      detailY += 2.5 * MM_TO_POINTS;
      doc.fontSize(2.5 * MM_TO_POINTS)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text(issueDate, detailsLeftX, detailY, {
           width: detailsWidth,
           ellipsis: true
         });
      
      detailY += detailLineHeight;

      // Card Status - ensure it fits within card bounds
      const cardStatusMaxY = BLEED + CARD_HEIGHT - securityHeight - securityMargin - 3 * MM_TO_POINTS;
      
      if (detailY < cardStatusMaxY) {
        doc.fontSize(2 * MM_TO_POINTS)
           .fillColor('#6b7280')
           .font('Helvetica-Bold')
           .text('Card Status:', detailsLeftX, detailY, {
             width: detailsWidth
           });
        
        detailY += 2.5 * MM_TO_POINTS;
        doc.fontSize(2.5 * MM_TO_POINTS)
           .fillColor('#059669')
           .font('Helvetica-Bold')
           .text('Active', detailsLeftX, detailY, {
             width: detailsWidth,
             ellipsis: true
           });
      }

      // Security notice (bottom) - positioned to not overlap with details
      const securityY = BLEED + CARD_HEIGHT - securityHeight;
      doc.rect(BLEED, securityY, CARD_WIDTH, securityHeight)
         .fillColor('#fef3c7')
         .fill();
      
      doc.rect(BLEED, securityY, CARD_WIDTH, 0.4 * MM_TO_POINTS)
         .fillColor('#fcd34d')
         .fill();

      doc.fontSize(1.9 * MM_TO_POINTS)
         .fillColor('#92400e')
         .font('Helvetica-Bold')
         .text('This card contains sensitive medical information. Keep it secure.', 
               BLEED + 5 * MM_TO_POINTS, securityY + 0.8 * MM_TO_POINTS, {
                 width: CARD_WIDTH - 10 * MM_TO_POINTS,
                 align: 'center'
               });
      
      doc.fontSize(1.9 * MM_TO_POINTS)
         .fillColor('#92400e')
         .font('Helvetica')
         .text('Report lost or stolen cards immediately.', 
               BLEED + 5 * MM_TO_POINTS, securityY + 3 * MM_TO_POINTS, {
                 width: CARD_WIDTH - 10 * MM_TO_POINTS,
                 align: 'center'
               });

      // No crop marks - clean card only
      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

