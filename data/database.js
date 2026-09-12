// Solar Generation Database & Analytics Engine
// Stores up to 6 months (180 days) of daily data and intraday power readings.
// Uses crash-resilient atomic file persistence and in-memory indexing.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const DB_FILE = path.join(DATA_DIR, 'solar-history.json');
const RETENTION_DAYS = 180; // 6 months retention

class SolarDatabase {
  constructor() {
    this.dailySummaries = {}; // Keyed by YYYY-MM-DD
    this.readings = [];       // Array of intraday time-series readings
    this.lastSaved = null;
    this.isDirty = false;
    this.init();
  }

  // Get current Indian Standard Time (IST) Date Object
  getISTDate(date = new Date()) {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 3600000; // UTC+5:30
    return new Date(utcTime + istOffset);
  }

  // Format date as YYYY-MM-DD in IST
  formatISTDate(date = new Date()) {
    const ist = this.getISTDate(date);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Format time as HH:MM in IST
  formatISTTime(date = new Date()) {
    const ist = this.getISTDate(date);
    const h = String(ist.getHours()).padStart(2, '0');
    const min = String(ist.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }

  // Extract clean number from string or number (e.g. "177 Watt" -> 177, "1.3kWh" -> 1.3)
  parseNumeric(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/,/g, '');
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  // Ensure storage directory exists and load DB
  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.dailySummaries = parsed.dailySummaries || {};
        this.readings = Array.isArray(parsed.readings) ? parsed.readings : [];
        this.lastSaved = parsed.lastSaved || null;
        console.log(`📊 [Database] Loaded ${Object.keys(this.dailySummaries).length} days and ${this.readings.length} readings from disk.`);
      } else {
        console.log('📊 [Database] No existing database found. Starting fresh real-data storage from today...');
        this.dailySummaries = {};
        this.readings = [];
        this.saveToDisk();
      }

      this.pruneOldData();
    } catch (err) {
      console.error('❌ [Database] Initialization error:', err.message);
      this.dailySummaries = {};
      this.readings = [];
      this.saveToDisk();
    }
  }

  // Save in-memory database to disk atomically
  saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const tempFile = `${DB_FILE}.tmp`;
      const payload = JSON.stringify({
        version: '1.0.0',
        retentionDays: RETENTION_DAYS,
        lastSaved: new Date().toISOString(),
        dailySummaries: this.dailySummaries,
        readings: this.readings
      }, null, 2);

      fs.writeFileSync(tempFile, payload, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      this.lastSaved = new Date().toISOString();
      this.isDirty = false;
    } catch (err) {
      console.error('❌ [Database] Failed to write database to disk:', err.message);
    }
  }

  // Automatically prune records older than RETENTION_DAYS (180 days = 6 months)
  pruneOldData() {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (RETENTION_DAYS * 24 * 60 * 60 * 1000));
    const cutoffStr = this.formatISTDate(cutoffDate);

    let prunedDays = 0;
    for (const dateKey of Object.keys(this.dailySummaries)) {
      if (dateKey < cutoffStr) {
        delete this.dailySummaries[dateKey];
        prunedDays++;
      }
    }

    const initialReadingsCount = this.readings.length;
    this.readings = this.readings.filter(r => (r.istDate || this.formatISTDate(new Date(r.timestamp))) >= cutoffStr);
    const prunedReadings = initialReadingsCount - this.readings.length;

    if (prunedDays > 0 || prunedReadings > 0) {
      console.log(`🧹 [Database] Pruned ${prunedDays} old days and ${prunedReadings} old readings (> 180 days).`);
      this.saveToDisk();
    }
  }

  // Record an intraday reading and update the day's summary
  recordReading({ waareePower, waareeYield, solaxPower, solaxYield, timestamp = new Date() }) {
    const recordDate = new Date(timestamp);
    const istDate = this.formatISTDate(recordDate);
    const istTime = this.formatISTTime(recordDate);

    const wPower = Math.round(this.parseNumeric(waareePower));
    const wYield = parseFloat(this.parseNumeric(waareeYield).toFixed(2));
    const sPower = Math.round(this.parseNumeric(solaxPower));
    const sYield = parseFloat(this.parseNumeric(solaxYield).toFixed(2));

    const tPower = wPower + sPower;
    const tYield = parseFloat((wYield + sYield).toFixed(2));

    // Create reading object
    const reading = {
      timestamp: recordDate.toISOString(),
      istDate,
      istTime,
      waareePower: wPower,
      waareeYield: wYield,
      solaxPower: sPower,
      solaxYield: sYield,
      totalPower: tPower,
      totalYield: tYield
    };

    // Store in intraday readings
    this.readings.push(reading);

    // Keep readings trimmed to maximum ~10,000 items in memory (~180 days * ~50 readings/day)
    if (this.readings.length > 12000) {
      this.readings.splice(0, this.readings.length - 10000);
    }

    // Update Daily Summary for istDate
    if (!this.dailySummaries[istDate]) {
      this.dailySummaries[istDate] = {
        date: istDate,
        waaree: {
          peakPower: wPower,
          finalYield: wYield
        },
        solax: {
          peakPower: sPower,
          finalYield: sYield
        },
        total: {
          peakPower: tPower,
          finalYield: tYield
        },
        readingsCount: 1,
        firstReadingAt: recordDate.toISOString(),
        lastReadingAt: recordDate.toISOString()
      };
    } else {
      const day = this.dailySummaries[istDate];
      day.readingsCount = (day.readingsCount || 0) + 1;
      day.lastReadingAt = recordDate.toISOString();

      // Update peaks (only if new value is higher)
      if (wPower > (day.waaree.peakPower || 0)) day.waaree.peakPower = wPower;
      if (sPower > (day.solax.peakPower || 0)) day.solax.peakPower = sPower;
      if (tPower > (day.total.peakPower || 0)) day.total.peakPower = tPower;

      // Update final yields (daily yields increase monotonically during the day)
      if (wYield >= (day.waaree.finalYield || 0)) day.waaree.finalYield = wYield;
      if (sYield >= (day.solax.finalYield || 0)) day.solax.finalYield = sYield;
      day.total.finalYield = parseFloat(((day.waaree.finalYield || 0) + (day.solax.finalYield || 0)).toFixed(2));
    }

    this.pruneOldData();
    this.saveToDisk();

    console.log(`💾 [Database] Recorded reading for ${istDate} ${istTime}: Waaree ${wPower}W (${wYield}kWh), Solax ${sPower}W (${sYield}kWh), Total ${tPower}W (${tYield}kWh)`);
    return reading;
  }

  // Get daily summaries within a range or date interval
  getDailySummaries({ range = '30d', fromDate, toDate } = {}) {
    const dates = Object.keys(this.dailySummaries).sort();
    if (dates.length === 0) return [];

    let filteredDates = dates;

    if (fromDate && toDate) {
      filteredDates = dates.filter(d => d >= fromDate && d <= toDate);
    } else if (range) {
      let daysLimit = 30;
      if (range === '7d') daysLimit = 7;
      else if (range === '30d') daysLimit = 30;
      else if (range === '90d') daysLimit = 90;
      else if (range === '180d' || range === '6m') daysLimit = 180;
      else if (range === 'all') daysLimit = 9999;

      const now = new Date();
      const cutoff = new Date(now.getTime() - (daysLimit * 24 * 60 * 60 * 1000));
      const cutoffStr = this.formatISTDate(cutoff);
      filteredDates = dates.filter(d => d >= cutoffStr);
    }

    return filteredDates.map(dateKey => this.dailySummaries[dateKey]);
  }

  // Get intraday readings for a specific date (defaults to today)
  getIntradayReadings(date) {
    const targetDate = date || this.formatISTDate(new Date());
    return this.readings.filter(r => r.istDate === targetDate);
  }

  // Get full 6-month analytics
  getAnalytics() {
    const summaries = Object.values(this.dailySummaries).sort((a, b) => a.date.localeCompare(b.date));
    const totalDays = summaries.length;

    if (totalDays === 0) {
      return {
        totalDays: 0,
        dateRange: { start: null, end: null },
        totalYield: { total: 0, waaree: 0, solax: 0 },
        dailyAverageYield: { total: 0, waaree: 0, solax: 0 },
        bestDay: null,
        peakPowerEver: { power: 0, date: null, system: 'total' },
        systemShare: { waareePercent: 50, solaxPercent: 50 },
        estimatedSavingsINR: 0,
        estimatedCo2SavedKg: 0,
        monthlyBreakdown: []
      };
    }

    let totalYieldSum = 0;
    let waareeYieldSum = 0;
    let solaxYieldSum = 0;

    let bestDay = summaries[0];
    let maxTotalYield = -1;

    let peakPowerEver = { power: 0, date: summaries[0].date, system: 'total' };

    // Monthly aggregation
    const monthsMap = {};

    summaries.forEach(day => {
      const tYield = day.total?.finalYield || 0;
      const wYield = day.waaree?.finalYield || 0;
      const sYield = day.solax?.finalYield || 0;

      totalYieldSum += tYield;
      waareeYieldSum += wYield;
      solaxYieldSum += sYield;

      if (tYield > maxTotalYield) {
        maxTotalYield = tYield;
        bestDay = day;
      }

      const tPeak = day.total?.peakPower || 0;
      if (tPeak > peakPowerEver.power) {
        peakPowerEver = {
          power: tPeak,
          date: day.date,
          system: 'total'
        };
      }

      // Group by Month (YYYY-MM)
      const monthKey = day.date.substring(0, 7);
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          month: monthKey,
          daysCount: 0,
          totalYield: 0,
          waareeYield: 0,
          solaxYield: 0,
          peakPower: 0
        };
      }

      const mObj = monthsMap[monthKey];
      mObj.daysCount++;
      mObj.totalYield += tYield;
      mObj.waareeYield += wYield;
      mObj.solaxYield += sYield;
      if (tPeak > mObj.peakPower) mObj.peakPower = tPeak;
    });

    const monthlyBreakdown = Object.values(monthsMap).map(m => ({
      month: m.month,
      daysCount: m.daysCount,
      totalYield: parseFloat(m.totalYield.toFixed(1)),
      waareeYield: parseFloat(m.waareeYield.toFixed(1)),
      solaxYield: parseFloat(m.solaxYield.toFixed(1)),
      avgDailyYield: parseFloat((m.totalYield / m.daysCount).toFixed(1)),
      peakPower: m.peakPower
    })).sort((a, b) => a.month.localeCompare(b.month));

    const waareePercent = totalYieldSum > 0 ? Math.round((waareeYieldSum / totalYieldSum) * 100) : 50;
    const solaxPercent = 100 - waareePercent;

    // Financial & Carbon estimates
    // Average residential/commercial solar power tariff in India: ~₹7.5 per kWh
    // Carbon emission reduction factor: ~0.82 kg CO2 per kWh of solar generation
    const estimatedSavingsINR = Math.round(totalYieldSum * 7.5);
    const estimatedCo2SavedKg = Math.round(totalYieldSum * 0.82);

    return {
      totalDays,
      dateRange: {
        start: summaries[0].date,
        end: summaries[summaries.length - 1].date
      },
      totalYield: {
        total: parseFloat(totalYieldSum.toFixed(1)),
        waaree: parseFloat(waareeYieldSum.toFixed(1)),
        solax: parseFloat(solaxYieldSum.toFixed(1))
      },
      dailyAverageYield: {
        total: parseFloat((totalYieldSum / totalDays).toFixed(1)),
        waaree: parseFloat((waareeYieldSum / totalDays).toFixed(1)),
        solax: parseFloat((solaxYieldSum / totalDays).toFixed(1))
      },
      bestDay: {
        date: bestDay.date,
        totalYield: bestDay.total?.finalYield || 0,
        waareeYield: bestDay.waaree?.finalYield || 0,
        solaxYield: bestDay.solax?.finalYield || 0,
        peakPower: bestDay.total?.peakPower || 0
      },
      peakPowerEver,
      systemShare: {
        waareePercent,
        solaxPercent
      },
      estimatedSavingsINR,
      estimatedCo2SavedKg,
      monthlyBreakdown
    };
  }

  // Export data in CSV or JSON
  exportData(format = 'csv') {
    const summaries = Object.values(this.dailySummaries).sort((a, b) => b.date.localeCompare(a.date));

    if (format === 'json') {
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        totalDays: summaries.length,
        dailySummaries: summaries,
        readings: this.readings
      }, null, 2);
    }

    // CSV format
    const headers = [
      'Date',
      'Waaree Yield (kWh)',
      'Solax Yield (kWh)',
      'Total Yield (kWh)',
      'Waaree Peak (W)',
      'Solax Peak (W)',
      'Total Peak (W)',
      'Readings Count',
      'First Reading At',
      'Last Reading At'
    ];

    const rows = summaries.map(s => [
      s.date,
      s.waaree?.finalYield ?? 0,
      s.solax?.finalYield ?? 0,
      s.total?.finalYield ?? 0,
      s.waaree?.peakPower ?? 0,
      s.solax?.peakPower ?? 0,
      s.total?.peakPower ?? 0,
      s.readingsCount ?? 0,
      s.firstReadingAt ? `"${s.firstReadingAt}"` : '',
      s.lastReadingAt ? `"${s.lastReadingAt}"` : ''
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // Update or set a specific day's summary manually
  setDaySummary(dateStr, { waareeYield, solaxYield, totalYield, waareePeak, solaxPeak, totalPeak }) {
    if (!this.dailySummaries[dateStr]) {
      this.dailySummaries[dateStr] = {
        date: dateStr,
        waaree: { peakPower: 0, finalYield: 0 },
        solax: { peakPower: 0, finalYield: 0 },
        total: { peakPower: 0, finalYield: 0 },
        readingsCount: 1,
        firstReadingAt: `${dateStr}T01:30:00.000Z`,
        lastReadingAt: `${dateStr}T13:30:00.000Z`
      };
    }

    const day = this.dailySummaries[dateStr];
    if (waareeYield !== undefined) day.waaree.finalYield = parseFloat(Number(waareeYield).toFixed(1));
    if (solaxYield !== undefined) day.solax.finalYield = parseFloat(Number(solaxYield).toFixed(1));
    if (totalYield !== undefined) {
      day.total.finalYield = parseFloat(Number(totalYield).toFixed(1));
    } else {
      day.total.finalYield = parseFloat(((day.waaree.finalYield || 0) + (day.solax.finalYield || 0)).toFixed(1));
    }

    if (waareePeak !== undefined) day.waaree.peakPower = Math.round(Number(waareePeak));
    if (solaxPeak !== undefined) day.solax.peakPower = Math.round(Number(solaxPeak));
    if (totalPeak !== undefined) {
      day.total.peakPower = Math.round(Number(totalPeak));
    } else {
      day.total.peakPower = (day.waaree.peakPower || 0) + (day.solax.peakPower || 0);
    }

    this.saveToDisk();
    console.log(`📝 [Database] Updated summary for ${dateStr}: Total ${day.total.finalYield} kWh (Waaree ${day.waaree.finalYield}, Solax ${day.solax.finalYield})`);
    return day;
  }

  // Calibrate historical baseline to match real plant capacity
  // e.g. calibrate to 35 units on reference date (2026-09-10)
  calibrateHistory(referenceDate = '2026-09-10', targetTotalYield = 35.0) {
    const todayStr = this.formatISTDate(new Date());
    const refDay = this.dailySummaries[referenceDate];
    const currentRefYield = refDay?.total?.finalYield || 18.1;
    const factor = targetTotalYield / currentRefYield;

    console.log(`⚖️ [Database] Calibrating history using reference ${referenceDate} (${currentRefYield} -> ${targetTotalYield} kWh, factor: ${factor.toFixed(4)})...`);

    for (const [dateStr, day] of Object.entries(this.dailySummaries)) {
      // Don't modify today's actively recording real data
      if (dateStr === todayStr) continue;

      const newWYield = parseFloat((day.waaree.finalYield * factor).toFixed(1));
      const newSYield = parseFloat((day.solax.finalYield * factor).toFixed(1));
      const newTYield = parseFloat((newWYield + newSYield).toFixed(1));

      const newWPeak = Math.round(day.waaree.peakPower * Math.min(1.85, factor));
      const newSPeak = Math.round(day.solax.peakPower * Math.min(1.85, factor));

      day.waaree.finalYield = newWYield;
      day.solax.finalYield = newSYield;
      day.total.finalYield = newTYield;

      day.waaree.peakPower = newWPeak;
      day.solax.peakPower = newSPeak;
      day.total.peakPower = newWPeak + newSPeak;
    }

    // Set reference date exactly to target if specified
    if (this.dailySummaries[referenceDate]) {
      const wShare = parseFloat((targetTotalYield * 0.55).toFixed(1));
      const sShare = parseFloat((targetTotalYield - wShare).toFixed(1));
      this.dailySummaries[referenceDate].waaree.finalYield = wShare;
      this.dailySummaries[referenceDate].solax.finalYield = sShare;
      this.dailySummaries[referenceDate].total.finalYield = targetTotalYield;
    }

    this.saveToDisk();
    console.log(`✅ [Database] Calibration complete. 10 September is now ${this.dailySummaries[referenceDate]?.total?.finalYield} units.`);
  }

  // Reset database to contain ONLY real data starting from today
  resetToRealDataOnly(todayReading = null) {
    console.log('🧹 [Database] Clearing all assumed/simulated history. Keeping only real data starting from today.');
    const todayStr = this.formatISTDate(new Date());

    const todaySummary = this.dailySummaries[todayStr];
    this.dailySummaries = {};
    if (todaySummary) {
      this.dailySummaries[todayStr] = todaySummary;
    }

    // Keep only today's actual readings
    this.readings = this.readings.filter(r => r.istDate === todayStr);

    if (todayReading) {
      this.recordReading(todayReading);
    }

    this.saveToDisk();
    console.log(`✅ [Database] Reset complete. Database now contains ONLY real data starting from today (${todayStr}). Total days: ${Object.keys(this.dailySummaries).length}`);
  }
}

// Singleton instance
const dbInstance = new SolarDatabase();

module.exports = dbInstance;
