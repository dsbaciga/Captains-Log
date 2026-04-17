import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { pdfImportController } from '../controllers/pdfImport.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Rate limit: 20 uploads per hour per IP (DoS protection for large file + LLM calls)
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many PDF uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

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
router.post('/upload', uploadRateLimit, uploadSingle, pdfImportController.uploadPdf);
router.get('/pending/count', pdfImportController.getPendingCount);
router.get('/pending', pdfImportController.getPendingEntities);
router.put('/pending/:id', pdfImportController.updatePendingEntity);
router.post('/pending/:id/accept', pdfImportController.acceptPendingEntity);
router.post('/pending/:id/reject', pdfImportController.rejectPendingEntity);
router.get('/', pdfImportController.getPdfImports);
router.get('/:id', pdfImportController.getPdfImportById);
router.post('/:id/reparse', pdfImportController.reparseImport);
router.delete('/:id', pdfImportController.deletePdfImport);

export default router;
