import { Request, Response, NextFunction } from 'express';
import searchService from '../services/search.service';
import { globalSearchQuerySchema } from '../types/search.types';

export class SearchController {
  async globalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const validatedQuery = globalSearchQuerySchema.parse(req.query);
      const result = await searchService.globalSearch(req.user.userId, validatedQuery);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SearchController();

