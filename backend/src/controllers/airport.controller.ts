import { Request, Response } from 'express';
import { asyncHandler } from '../http/asyncHandler';
import airportService from '../services/airport.service';

export const airportController = {
  /**
   * GET /api/airports?q=<query>
   * Search airports by IATA/ICAO code or by airport/city name.
   */
  searchAirports: asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = airportService.searchAirports(q);

    res.json({
      status: 'success',
      data: results,
    });
  }),
};
