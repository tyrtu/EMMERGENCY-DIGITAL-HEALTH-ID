
import PDFDocument from 'pdfkit';

/**
 * Generate a simple academic documentation PDF and return it as a Buffer.
 * This provides a minimal implementation so the route can return a downloadable PDF.
 */
export async function generateAcademicDocPDF() {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({ autoFirstPage: true });
			const chunks = [];

			doc.on('data', (chunk) => chunks.push(chunk));
			doc.on('end', () => resolve(Buffer.concat(chunks)));
			doc.on('error', (err) => reject(err));

			// Header
			doc.fontSize(18).text('Emergency Digital Health ID', { align: 'center' });
			doc.moveDown(0.5);
			doc.fontSize(14).text('Academic Documentation', { align: 'center' });
			doc.moveDown(1);

			// Body sample content
			doc.fontSize(11).text('This PDF contains the academic documentation for the Emergency Digital Health ID project.');
			doc.moveDown(0.5);

			doc.text('Included sections:', { underline: true });
			doc.list([
				'Project overview and goals',
				'System architecture and components',
				'Data model and schemas',
				'API endpoints and examples',
			]);

			doc.addPage();
			doc.fontSize(12).text('Notes', { underline: true });
			doc.moveDown(0.5);
			doc.fontSize(10).text('This is a generated sample PDF. Replace this generator with the full documentation exporter when available.');

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}

export default generateAcademicDocPDF;
