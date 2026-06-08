import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { pdfImportController } from '../controllers/pdfImport.controller';
import { authenticate } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';

const router = Router();
router.use(authenticate);

// PDF upload triggers an LLM parsing pass — share the per-user aiLimiter
// (default 20/hour) so a single account can't drain the shared LLM quota.
// Must be applied AFTER `authenticate` (above) so it keys off req.user.id.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Wrap multer to return proper 400/413 errors instead of letting them bubble to the 500 handler
function uploadSingle(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) { next(); return; }
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({ status: 'error', message: err.message });
      return;
    }
    if (err instanceof Error && err.message === 'Only PDF files are allowed') {
      res.status(400).json({ status: 'error', message: err.message });
      return;
    }
    next(err);
  });
}

// IMPORTANT: Static sub-paths must be registered before parameterized /:id
router.post('/upload', aiLimiter, uploadSingle, pdfImportController.uploadPdf);
router.get('/pending/count', pdfImportController.getPendingCount);
router.get('/pending', pdfImportController.getPendingEntities);
router.put('/pending/:id', pdfImportController.updatePendingEntity);
router.post('/pending/:id/accept', pdfImportController.acceptPendingEntity);
router.post('/pending/:id/reject', pdfImportController.rejectPendingEntity);
router.get('/', pdfImportController.getPdfImports);
router.get('/:id', pdfImportController.getPdfImportById);
// Reparse re-invokes the LLM, so it shares the same per-user budget.
router.post('/:id/reparse', aiLimiter, pdfImportController.reparseImport);
router.delete('/:id', pdfImportController.deletePdfImport);

export default router;
