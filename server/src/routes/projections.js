import { Router } from 'express';
import { C, fromDocs } from '../mongo.js';
import { getSeasonForMonth, isMonthInSeason } from '../services/pricing.js';
import { asyncHandler } from '../http.js';

const router = Router();

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const prefix = String(year);

    const yearBookings = fromDocs(
      await C('bookings')
        .find({
          status: { $ne: 'cancelado' },
          room_id: req.localId,
          start_time: { $regex: `^${prefix}` },
        })
        .toArray()
    );

    const monthlyMap = {};
    for (const booking of yearBookings) {
      const month = new Date(booking.start_time).getMonth() + 1;
      if (!monthlyMap[month]) {
        monthlyMap[month] = {
          month,
          events: 0,
          total_attendees: 0,
          projected_revenue: 0,
          deposits_collected: 0,
          pending_balance: 0,
        };
      }
      monthlyMap[month].events += 1;
      monthlyMap[month].total_attendees += booking.attendees ?? 0;
      monthlyMap[month].projected_revenue += booking.total_cost ?? 0;
      monthlyMap[month].deposits_collected += booking.deposit_paid ?? 0;
      monthlyMap[month].pending_balance += booking.balance_due ?? 0;
    }

    const byMonth = await Promise.all(
      MONTH_NAMES.map(async (name, index) => {
        const month = index + 1;
        const data = monthlyMap[month];
        const season = await getSeasonForMonth(month, req.localId);

        return {
          month,
          monthName: name,
          seasonName: season?.name ?? 'Temporada regular',
          seasonMultiplier: season?.multiplier ?? 1,
          events: data?.events ?? 0,
          totalAttendees: data?.total_attendees ?? 0,
          projectedRevenue: data?.projected_revenue ?? 0,
          depositsCollected: data?.deposits_collected ?? 0,
          pendingBalance: data?.pending_balance ?? 0,
        };
      })
    );

    const seasons = fromDocs(
      await C('season_rates')
        .find({ local_id: req.localId })
        .toArray()
    );

    const bySeason = seasons
      .map((season) => {
        const matched = yearBookings.filter((b) => {
          const month = new Date(b.start_time).getMonth() + 1;
          return isMonthInSeason(month, season.month_start, season.month_end);
        });

        return {
          season_name: season.name,
          season_multiplier: season.multiplier,
          events: matched.length,
          total_attendees: matched.reduce((sum, b) => sum + b.attendees, 0),
          projected_revenue: matched.reduce((sum, b) => sum + b.total_cost, 0),
          deposits_collected: matched.reduce((sum, b) => sum + b.deposit_paid, 0),
        };
      })
      .sort((a, b) => b.season_multiplier - a.season_multiplier);

    const totals = {
      events: yearBookings.length,
      total_attendees: yearBookings.reduce((sum, b) => sum + (b.attendees ?? 0), 0),
      projected_revenue: yearBookings.reduce((sum, b) => sum + (b.total_cost ?? 0), 0),
      deposits_collected: yearBookings.reduce((sum, b) => sum + (b.deposit_paid ?? 0), 0),
      pending_balance: yearBookings.reduce((sum, b) => sum + (b.balance_due ?? 0), 0),
    };

    res.json({
      year,
      totals,
      byMonth,
      bySeason,
    });
  })
);

export default router;
